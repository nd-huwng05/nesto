import {ActivityIndicator, Alert, Image, LayoutAnimation, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View, useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useCallback, useMemo, useRef, useState} from 'react';
import {AntDesign, Ionicons} from '@expo/vector-icons';
import {useFocusEffect} from '@react-navigation/native';
import {STAFF_MEDIA} from '../../../constants/staffMedia';
import {getUnreadCustomerNotificationCount} from '../../../services/NotificationService';
import api, {endpoints} from '../../../configuration/Apis';
import {getSession} from '../../../utils/authStorage';
import Avatar from '../../../components/common/Avatar';
import * as Location from 'expo-location';
import {connectCustomerUpdates} from '../../../services/WebSocketService';

const BASE_TABS = ['AI ✨', 'ALL'];
const PRIMARY = '#5b79df';
const DEFAULT_HOTEL_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=1400&q=80&fm=jpg';
const DEFAULT_RATING_VALUE = 0;

const toImageUri = (image) => {
    if (typeof image === 'number') {
        return Image.resolveAssetSource(image)?.uri || DEFAULT_HOTEL_IMAGE;
    }
    if (typeof image === 'string' && image.trim().length > 0) {
        return image;
    }
    return DEFAULT_HOTEL_IMAGE;
};

const normalizeThemeNames = (themes) => {
    const list = Array.isArray(themes) ? themes : [];
    const names = list
        .map((t) => {
            if (typeof t === 'string') return t;
            return String(t?.name || '').trim();
        })
        .filter(Boolean);
    return Array.from(new Set(names));
};

function HotelCard({item, onPress, cardWidth}) {
    const imageUri = toImageUri(item?.image);
    const safeRating = Number.isFinite(item?.syncedRating) ? item.syncedRating : DEFAULT_RATING_VALUE;
    const reviewCount = Number.isFinite(item?.reviewCount) ? item.reviewCount : 0;
    const displayRating = safeRating.toFixed(1);

    return (
        <TouchableOpacity style={[styles.hotelCard, {width: cardWidth}]} activeOpacity={0.92} onPress={onPress}>
            <Image source={{uri: imageUri}} style={styles.hotelImage} resizeMode="cover"/>
            <View style={styles.hotelMeta}>
                <View style={styles.hotelTitleRow}>
                    <Text style={styles.hotelTitle} numberOfLines={1}>{item.title}</Text>
                    {String(item?.price || '').trim() ? (
                        <Text style={styles.hotelPrice} numberOfLines={1}>{String(item.price).trim()}</Text>
                    ) : null}
                </View>
                <View style={styles.hotelInfoRow}>
                    <Text style={styles.hotelCity} numberOfLines={1}>{item.city}</Text>
                    <View style={styles.ratingRow}>
                        <AntDesign name="star" size={12} color="#f5c51a"/>
                        <Text style={styles.hotelRating}>{displayRating} ({reviewCount})</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

function CategoryTabs({tabs, activeTab, onTabPress}) {
    return (
        <View style={styles.categoryBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                {tabs.map((tab) => {
                    const isActive = tab === activeTab;

                    return (
                        <TouchableOpacity key={tab} style={styles.categoryItem} onPress={() => onTabPress(tab)} activeOpacity={0.8}>
                            <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}>
                                {tab}
                            </Text>
                            {isActive ? <View style={styles.activeUnderline} /> : <View style={styles.inactiveUnderline} />}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

function Section({title, data, cardWidth, navigation}) {
    return (
        <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {data.length ? (
                <View style={styles.cardGrid}>
                    {data.map((item) => {
                        const imageUri = toImageUri(item?.image);

                        return (
                            <HotelCard
                                key={item.id}
                                item={item}
                                cardWidth={cardWidth}
                                onPress={() =>
                                    navigation.navigate('CustomerHomeDetailSceen', {
                                        room: {name: item.title, image: imageUri},
                                        hotelName: item.title,
                                        branchId: item.branchId || item.branchID || item.id,
                                        hotelAddress: item.address || item.city,
                                        location: item.address || item.city,
                                        hotelDescription: item.description || '',
                                        heroImage: imageUri,
                                        rating: Number.isFinite(item?.syncedRating) ? item.syncedRating : DEFAULT_RATING_VALUE,
                                        reviews: Number.isFinite(item?.reviewCount) ? item.reviewCount : 0,
                                    })
                                }
                            />
                        );
                    })}
                </View>
            ) : (
                <Text style={styles.emptyText}>No hotel matches your filter.</Text>
            )}
        </View>
    );
}

function filterHotelsByTab(tab, catalog) {
    const key = String(tab || '').trim();
    if (!key || key === 'ALL') return catalog;
    return catalog.filter((row) => Array.isArray(row?.themes) && row.themes.includes(key));
}

function filterHotelsByKeyword(items, keyword) {
    if (!keyword) return items;

    return items.filter((item) => {
        const haystack = `${item?.title || ''} ${item?.city || ''} ${item?.category || ''}`.toLowerCase();
        return haystack.includes(keyword);
    });
}

export function HomeScreen({navigation}) {
    const {width} = useWindowDimensions();
    const horizontalPadding = 16;
    const gap = 12;
    const contentWidth = Math.max(width - horizontalPadding * 2, 240);
    const cardWidth = (contentWidth - gap) / 2;
    const [activeTab, setActiveTab] = useState('ALL');
    const [searchText, setSearchText] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState([]);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const [catalog, setCatalog] = useState([]);
    const [locationLabel, setLocationLabel] = useState('All locations');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarName, setAvatarName] = useState('');
    const hasLoadedRef = useRef(false);
    const [tabs, setTabs] = useState(BASE_TABS);
    const [themes, setThemes] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [accessToken, setAccessToken] = useState('');
    const keyword = searchText.trim().toLowerCase();

    const loadCatalog = useCallback(async ({coords, silent} = {}) => {
        const shouldBlock = !silent && catalog.length === 0;
        if (shouldBlock) setIsLoading(true);
        if (silent) setIsSyncing(true);
        try {
            const params = {};
            if (coords?.latitude != null && coords?.longitude != null) {
                params.latitude = String(coords.latitude);
                params.longitude = String(coords.longitude);
            }
            const res = await api.get(endpoints['customer-catalog'], {params});
            const rows = res?.data?.results || res?.data || [];
            setCatalog(Array.isArray(rows) ? rows : []);
        } catch (error) {
            if (!silent) Alert.alert('Error', 'Failed to load stays. Please try again.');
        } finally {
            if (shouldBlock) setIsLoading(false);
            if (silent) setIsSyncing(false);
        }
    }, [catalog.length]);

    const loadThemes = useCallback(async () => {
        try {
            const res = await api.get(endpoints['themes']);
            const rows = res?.data?.results || res?.data || [];
            const list = Array.isArray(rows) ? rows : [];
            setThemes(list);
            const names = list
                .map((t) => String(t?.name || '').trim())
                .filter((name) => Boolean(name) && !BASE_TABS.includes(name));
            setTabs([...BASE_TABS, ...names]);
        } catch (error) {
            setThemes([]);
            setTabs(BASE_TABS);
        }
    }, []);

    const attemptLocationRefresh = useCallback(async () => {
        try {
            const perm = await Location.requestForegroundPermissionsAsync();
            if (perm.status !== 'granted') return;
            const current = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
            const latitude = Number(current?.coords?.latitude);
            const longitude = Number(current?.coords?.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
            await loadCatalog({coords: {latitude, longitude}, silent: true});
        } catch {
        }
    }, [loadCatalog]);

    const runAiSearch = useCallback(async () => {
        const q = String(searchText || '').trim();
        if (!q) {
            await loadCatalog();
            return;
        }
        setIsSearching(true);
        try {
            const params = {q};
            const res = await api.get(endpoints['ai-search'], {params});
            const branches = res?.data?.results?.branches || [];
            setCatalog(Array.isArray(branches) ? branches : []);
            setActiveTab('ALL');
        } catch (error) {
            Alert.alert('Error', 'AI search failed. Please try again.');
        } finally {
            setIsSearching(false);
        }
    }, [loadCatalog, searchText]);

    const loadAiSuggestions = useCallback(async () => {
        const q = String(searchText || '').trim();
        if (!q) {
            setAiSuggestions([]);
            return;
        }
        setIsAiLoading(true);
        try {
            const params = {q};
            const res = await api.get(endpoints['search-suggestions'], {params});
            const rows = res?.data?.results || [];
            setAiSuggestions(Array.isArray(rows) ? rows : []);
        } catch (error) {
            setAiSuggestions([]);
        } finally {
            setIsAiLoading(false);
        }
    }, [searchText]);

    useFocusEffect(
        useCallback(() => {
            if (hasLoadedRef.current) return;
            hasLoadedRef.current = true;
            const runLoad = async () => {
                try {
                    const session = await getSession();
                    setAccessToken(String(session?.token || '').trim());
                    const avatar = String(session?.user?.avatar || '').trim();
                    const name = String(session?.user?.name || session?.user?.full_name || session?.user?.email || '').trim();
                    const pref = String(session?.user?.preferredLocation || '').trim();
                    setAvatarUrl(avatar);
                    setAvatarName(name);
                    setLocationLabel(pref || 'All locations');
                } catch {
                    setAvatarUrl('');
                    setAvatarName('');
                    setLocationLabel('All locations');
                }
                await Promise.all([loadThemes(), loadCatalog({}),]);
                attemptLocationRefresh();
                try {
                    setUnreadNotificationCount(await getUnreadCustomerNotificationCount());
                } catch {
                    setUnreadNotificationCount(0);
                }
            };

            runLoad();
        }, [attemptLocationRefresh, loadCatalog, loadThemes])
    );

    useFocusEffect(
        useCallback(() => {
            if (catalog.length > 0) return;
            loadCatalog({silent: true}).catch(() => {});
        }, [catalog.length, loadCatalog])
    );

    useFocusEffect(
        useCallback(() => {
            if (!accessToken) return () => {};
            let disposed = false;
            let disconnect = () => {};
            (async () => {
                disconnect = await connectCustomerUpdates({
                    token: accessToken,
                    onMessage: (msg) => {
                        if (disposed) return;
                        if (msg?.type === 'review_created' || msg?.type === 'theme_update') {
                            loadCatalog({silent: true}).catch(() => {});
                            loadThemes().catch(() => {});
                        }
                    },
                });
            })();
            return () => {
                disposed = true;
                disconnect?.();
            };
        }, [accessToken, loadCatalog, loadThemes])
    );

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await loadCatalog();
            setUnreadNotificationCount(await getUnreadCustomerNotificationCount());
        } catch (error) {
            Alert.alert('Error', 'Failed to refresh. Please try again.');
        } finally {
            setIsRefreshing(false);
        }
    }, [loadCatalog]);

    const enrichedCatalog = useMemo(() => {
        const rows = Array.isArray(catalog) ? catalog : [];
        return rows.map((item) => ({
            ...item,
            syncedRating: Number.isFinite(item?.rating) ? item.rating : DEFAULT_RATING_VALUE,
            reviewCount: Number.isFinite(item?.reviewCount) ? item.reviewCount : 0,
            themes: normalizeThemeNames(item?.themes),
            price: String(item?.price || '').trim(),
        }));
    }, [catalog]);

    const filteredHotels = useMemo(() => {
        if (activeTab === 'AI ✨' && !String(searchText || '').trim()) {
            const themed = enrichedCatalog.filter((row) => Array.isArray(row?.themes) && row.themes.includes('AI ✨'));
            return filterHotelsByKeyword(themed, keyword);
        }
        if (activeTab !== 'ALL') {
            const themeKey = String(activeTab || '').trim();
            const themed = enrichedCatalog.filter((row) => Array.isArray(row?.themes) && row.themes.includes(themeKey));
            return filterHotelsByKeyword(themed, keyword);
        }
        const byTab = filterHotelsByTab(activeTab, enrichedCatalog);
        return filterHotelsByKeyword(byTab, keyword);
    }, [activeTab, enrichedCatalog, keyword]);

    const allTabOrder = tabs.filter((t) => t !== 'AI ✨' && t !== 'ALL');
    const allTabSections = useMemo(() => {
        const sections = allTabOrder.map((tab) => ({
            title: tab,
            data: filterHotelsByKeyword(enrichedCatalog.filter((row) => Array.isArray(row?.themes) && row.themes.includes(tab)), keyword),
        }));

        return keyword ? sections.filter((section) => section.data.length > 0) : sections;
    }, [enrichedCatalog, keyword]);

    if (isLoading && !enrichedCatalog.length) {
        return (
            <SafeAreaView style={styles.page}>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color="#5b79df" />
                    <Text style={styles.loadingText}>Loading stays...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.page}>
            <View style={styles.topChrome}>
                <View style={styles.headerRow}>
                    <View style={styles.locationWrap}>
                        <Text style={styles.locationLabel}>Current Location</Text>
                        <Text style={styles.locationValue} numberOfLines={1}>{locationLabel}</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.bellWrap} onPress={() => navigation.navigate('CustomerNotificationsScreen')}>
                            <Ionicons name="notifications" size={20} color="#1f1f1f"/>
                            {unreadNotificationCount > 0 ? (
                                <View style={styles.alertBadge}>
                                    <Text style={styles.alertBadgeText}>{`+${Math.min(unreadNotificationCount, 99)}`}</Text>
                                </View>
                            ) : null}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('CustomerProfileScreen')}>
                            <Avatar uri={avatarUrl} name={avatarName} size={44} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.searchBox}>
                    <View style={styles.aiIconWrap}>
                        <Ionicons name="sparkles" size={16} color="#6a74ff"/>
                    </View>
                    <TextInput
                        value={searchText}
                        onChangeText={setSearchText}
                        placeholder="Search with AI"
                        placeholderTextColor="#6B7280"
                        style={styles.searchInput}
                        returnKeyType="search"
                        onFocus={() => setActiveTab('AI ✨')}
                        onSubmitEditing={async () => {
                            await loadAiSuggestions();
                            await runAiSearch();
                        }}
                    />
                    {isSearching ? (
                        <ActivityIndicator size="small" color={PRIMARY} />
                    ) : null}
                </View>

                <CategoryTabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabPress={(tab) => {
                        if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
                            UIManager.setLayoutAnimationEnabledExperimental(true);
                        }
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setActiveTab(tab);
                    }}
                />
            </View>

            <ScrollView
                style={styles.listScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={[PRIMARY]}
                        tintColor={PRIMARY}
                    />
                }
            >
                {activeTab === 'AI ✨' ? (
                    String(searchText || '').trim() ? (
                    <View style={styles.sectionWrap}>
                        <Text style={styles.sectionTitle}>Suggestions</Text>
                        {isAiLoading ? (
                            <View style={styles.loadingInline}>
                                <ActivityIndicator size="small" color="#5b79df" />
                            </View>
                        ) : aiSuggestions.length ? (
                            <View style={styles.suggestionList}>
                                {aiSuggestions.map((row) => {
                                    const key = `${row?.type || 'item'}-${row?.id || Math.random()}`;
                                    const title = String(row?.title || '').trim();
                                    const subtitle = String(row?.subtitle || '').trim();
                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            style={styles.suggestionItem}
                                            activeOpacity={0.85}
                                            onPress={() => {
                                                if (row?.type === 'branch') {
                                                    navigation.navigate('CustomerHomeDetailSceen', {branchId: row?.id, hotelName: title, hotelAddress: subtitle, heroImage: row?.image});
                                                }
                                            }}
                                        >
                                            <Text style={styles.suggestionTitle} numberOfLines={1}>{title || 'Result'}</Text>
                                            <Text style={styles.suggestionSubtitle} numberOfLines={1}>{subtitle}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ) : (
                            <Text style={styles.emptyText}>Start typing to see suggestions.</Text>
                        )}
                    </View>
                    ) : (
                        <Section title="AI ✨" data={filteredHotels} cardWidth={cardWidth} navigation={navigation}/>
                    )
                ) : activeTab === 'ALL' ? (
                    enrichedCatalog.length && allTabOrder.length === 0 ? (
                        <Section title="All" data={filteredHotels} cardWidth={cardWidth} navigation={navigation}/>
                    ) : allTabSections.length ? (
                        allTabSections.map((section) => (
                            <Section
                                key={section.title}
                                title={section.title}
                                data={section.data}
                                cardWidth={cardWidth}
                                navigation={navigation}
                            />
                        ))
                    ) : (
                        <Text style={styles.emptyText}>{keyword ? 'No results match your search.' : 'No stays available yet.'}</Text>
                    )
                ) : (
                    <Section title={activeTab} data={filteredHotels} cardWidth={cardWidth} navigation={navigation}/>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 16,
    },
    loadingText: {
        marginTop: 10,
        color: '#333333',
        fontSize: 16,
        lineHeight: 22,
        fontFamily: 'SF-Bold',
    },
    topChrome: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 4,
        backgroundColor: '#F5F7FA',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E7EB',
        zIndex: 2,
    },
    listScroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 112,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    locationWrap: {
        flex: 1,
        paddingRight: 12,
    },
    locationLabel: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#333333',
    },
    locationValue: {
        fontFamily: 'SF-Bold',
        fontSize: 22,
        lineHeight: 24,
        color: '#111111',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    bellWrap: {
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
    },
    alertBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#ff3b30',
        position: 'absolute',
        top: 1,
        right: -2,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#efefef',
    },
    alertBadgeText: {
        fontFamily: 'SF-Bold',
        fontSize: 9,
        color: '#fff',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    searchBox: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#111111',
        borderRadius: 18,
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: 0,
        backgroundColor: '#FFFFFF',
    },
    aiIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 12,
        backgroundColor: 'rgba(130,148,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        height: 40,
        minHeight: 40,
        maxHeight: 40,
        fontFamily: 'SF-Regular',
        fontSize: 16,
        lineHeight: 22,
        paddingVertical: 0,
        color: '#111111',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    categoryBar: {
        marginTop: 12,
        marginBottom: 2,
    },
    categoryRow: {
        paddingBottom: 4,
        paddingRight: 8,
    },
    categoryItem: {
        alignItems: 'center',
        marginRight: 22,
        paddingBottom: 6,
    },
    tabLabel: {
        fontFamily: 'SF-Regular',
        fontSize: 16,
        lineHeight: 22,
        color: '#6B7280',
        paddingHorizontal: 2,
    },
    tabLabelActive: {
        fontFamily: 'SF-Bold',
        fontSize: 16,
        fontWeight: '700',
        color: PRIMARY,
    },
    activeUnderline: {
        marginTop: 8,
        height: 3,
        width: '100%',
        borderRadius: 999,
        backgroundColor: PRIMARY,
    },
    inactiveUnderline: {
        marginTop: 8,
        height: 3,
        width: '100%',
        backgroundColor: 'transparent',
    },
    sectionWrap: {
        marginTop: 28,
    },
    loadingInline: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    suggestionList: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    suggestionItem: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#efefef',
    },
    suggestionTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 16,
        lineHeight: 22,
        color: '#111111',
    },
    suggestionSubtitle: {
        marginTop: 4,
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#333333',
    },
    sectionTitle: {
        fontFamily: 'SF-Black',
        fontSize: 24,
        lineHeight: 28,
        color: '#1b1b1b',
        marginBottom: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    cardGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    hotelCard: {
        minWidth: 0,
        backgroundColor: '#f5f5f5',
        borderRadius: 18,
        padding: 8,
    },
    hotelImage: {
        width: '100%',
        height: 126,
        borderRadius: 12,
    },
    hotelMeta: {
        paddingTop: 8,
        paddingHorizontal: 2,
        paddingBottom: 6,
    },
    hotelTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
    },
    hotelTitle: {
        flex: 1,
        fontFamily: 'SF-Black',
        fontSize: 16,
        lineHeight: 20,
        color: '#111111',
    },
    hotelPrice: {
        fontFamily: 'SF-Bold',
        fontSize: 16,
        lineHeight: 22,
        color: '#111111',
    },
    hotelInfoRow: {
        marginTop: 2,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
    },
    hotelCity: {
        flex: 1,
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#333333',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 1,
    },
    hotelRating: {
        marginLeft: 3,
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#333333',
    },
    emptyText: {
        fontFamily: 'SF-Regular',
        fontSize: 16,
        lineHeight: 22,
        color: '#333333',
        paddingVertical: 8,
    },
});
