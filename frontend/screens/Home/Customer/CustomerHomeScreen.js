import {Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useCallback, useMemo, useState} from 'react';
import {AntDesign, Ionicons} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import {familyHotels, businessHotels} from '../../../configuration/hotelsData';
import {STAFF_MEDIA} from '../../../constants/staffMedia';
import CustomerBottomTabBar from '../../../components/customer/CustomerBottomTabBar';
import {getUnreadCustomerNotificationCount} from '../../../services/NotificationService';

const tabs = ['ALL', 'Featured', 'Suite', 'View', 'Family', 'Business'];
const DEFAULT_HOTEL_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=1400&q=80&fm=jpg';
const WATCHLIST_CUSTOM_POSTS_KEY = 'customer_watchlist_custom_posts';
const HOTEL_RATINGS_KEY = 'customer_hotel_ratings';
const DEFAULT_RATING_VALUE = 5;

const normalizeHotelName = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const toImageUri = (image) => {
    if (typeof image === 'number') {
        return Image.resolveAssetSource(image)?.uri || DEFAULT_HOTEL_IMAGE;
    }
    if (typeof image === 'string' && image.trim().length > 0) {
        return image;
    }
    return DEFAULT_HOTEL_IMAGE;
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
                    <Text style={styles.hotelPrice} numberOfLines={1}>{item.price}</Text>
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

function CategoryTabs({activeTab, onTabPress}) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {tabs.map((tab) => {
                const isActive = tab === activeTab;

                return (
                    <TouchableOpacity key={tab} style={styles.categoryItem} onPress={() => onTabPress(tab)} activeOpacity={0.8}>
                        <Text
                            style={[styles.tabLabel, isActive ? styles.tabLabelActive : null]}
                        >
                            {tab}
                        </Text>
                        {isActive ? <View style={styles.activeUnderline}/> : null}
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
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
    return catalog.filter((item) => {
        const title = String(item?.title || '').toLowerCase();
        const city = String(item?.city || '').toLowerCase();
        const rating = Number.parseFloat(item?.rating || '0');

        if (tab === 'ALL') {
            return true;
        }
        if (tab === 'Family' || tab === 'Business') {
            return item.category === tab;
        }
        if (tab === 'Featured') {
            return rating >= 4.7;
        }
        if (tab === 'Suite') {
            return title.includes('suite');
        }
        if (tab === 'View') {
            return true;
        }
        return city.length > 0 || title.length > 0;
    });
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
    const [ratingStatsByHotel, setRatingStatsByHotel] = useState({});
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const keyword = searchText.trim().toLowerCase();

    const loadRatingStats = useCallback(async () => {
        try {
            const [rawCustomPosts, rawHotelRatings] = await AsyncStorage.multiGet([
                WATCHLIST_CUSTOM_POSTS_KEY,
                HOTEL_RATINGS_KEY,
            ]);
            const parsedCustomPosts = rawCustomPosts?.[1] ? JSON.parse(rawCustomPosts[1]) : [];
            const parsedHotelRatings = rawHotelRatings?.[1] ? JSON.parse(rawHotelRatings[1]) : [];
            const safeCustomPosts = Array.isArray(parsedCustomPosts)
                ? parsedCustomPosts.filter((item) => item && typeof item === 'object')
                : [];
            const safeHotelRatings = Array.isArray(parsedHotelRatings)
                ? parsedHotelRatings.filter((item) => item && typeof item === 'object')
                : [];

            const allRatingSources = [...safeCustomPosts, ...safeHotelRatings];

            const summary = {};
            allRatingSources.forEach((item) => {
                const hotelKey = normalizeHotelName(item?.hotelName);
                const ratingValue = Number(item?.rating);
                if (!hotelKey || !Number.isFinite(ratingValue)) return;

                if (!summary[hotelKey]) {
                    summary[hotelKey] = {sum: 0, count: 0};
                }
                summary[hotelKey].sum += Math.max(1, Math.min(5, ratingValue));
                summary[hotelKey].count += 1;
            });

            setRatingStatsByHotel(summary);
        } catch {
            setRatingStatsByHotel({});
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            const runLoad = async () => {
                await loadRatingStats();
                setUnreadNotificationCount(await getUnreadCustomerNotificationCount());
            };

            runLoad();
        }, [loadRatingStats])
    );

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await loadRatingStats();
        setIsRefreshing(false);
    }, [loadRatingStats]);

    const catalog = useMemo(
        () => [
            ...familyHotels.map((item) => ({...item, category: 'Family'})),
            ...businessHotels.map((item) => ({...item, category: 'Business'})),
        ],
        []
    );

    const enrichedCatalog = useMemo(() => {
        const findStats = (title) => {
            const normalizedTitle = normalizeHotelName(title);
            if (!normalizedTitle) return null;
            if (ratingStatsByHotel[normalizedTitle]) return ratingStatsByHotel[normalizedTitle];

            const matchedKey = Object.keys(ratingStatsByHotel).find(
                (key) => key.includes(normalizedTitle) || normalizedTitle.includes(key)
            );
            return matchedKey ? ratingStatsByHotel[matchedKey] : null;
        };

        return catalog.map((item) => {
            const stats = findStats(item?.title);
            const reviewCount = stats?.count || 0;
            const syncedRating = reviewCount > 0
                ? Number((stats.sum / reviewCount).toFixed(1))
                : DEFAULT_RATING_VALUE;

            return {
                ...item,
                syncedRating,
                reviewCount,
            };
        });
    }, [catalog, ratingStatsByHotel]);

    const filteredHotels = useMemo(() => {
        const byTab = filterHotelsByTab(activeTab, enrichedCatalog);
        return filterHotelsByKeyword(byTab, keyword);
    }, [activeTab, enrichedCatalog, keyword]);

    const allTabOrder = ['Featured', 'Suite', 'View', 'Family', 'Business'];
    const allTabSections = useMemo(() => {
        const sections = allTabOrder.map((tab) => ({
            title: tab,
            data: filterHotelsByKeyword(filterHotelsByTab(tab, enrichedCatalog), keyword),
        }));

        return keyword ? sections.filter((section) => section.data.length > 0) : sections;
    }, [enrichedCatalog, keyword]);

    return (
        <SafeAreaView style={styles.page}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={['#5b79df']}
                        tintColor="#5b79df"
                    />
                }
            >
                <View style={styles.headerRow}>
                    <View style={styles.locationWrap}>
                        <Text style={styles.locationLabel}>Current Location</Text>
                        <Text style={styles.locationValue} numberOfLines={1}>Labuan Bajo, INA</Text>
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
                                <Image
                                    source={{uri: STAFF_MEDIA.USER_PLACEHOLDER}}
                                    style={styles.avatar}
                                />
                            </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.searchBox}>
                    <Image source={require('../../../assets/images/hotels/Logo-AI.png')} style={styles.aiSearchIcon}/>
                    <TextInput
                        value={searchText}
                        onChangeText={setSearchText}
                        placeholder="AI will find room you want"
                        placeholderTextColor="#8e8e8e"
                        style={styles.searchInput}
                    />
                </View>

                <CategoryTabs activeTab={activeTab} onTabPress={setActiveTab} />

                {activeTab === 'ALL' ? (
                    allTabSections.length ? (
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
                        <Text style={styles.emptyText}>No hotel matches your keyword.</Text>
                    )
                ) : (
                    <Section title={activeTab} data={filteredHotels} cardWidth={cardWidth} navigation={navigation}/>
                )}
            </ScrollView>

            <CustomerBottomTabBar navigation={navigation} activeTab="Home"/>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: '#efefef',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 10,
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
        fontSize: 13,
        color: '#272727',
    },
    locationValue: {
        fontFamily: 'SF-Bold',
        fontSize: 28,
        lineHeight: 32,
        color: '#1b1b1b',
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
        borderColor: '#4a4a4a',
        borderRadius: 18,
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: 0,
        backgroundColor: '#efefef',
    },
    aiSearchIcon: {
        width: 30,
        height: 30,
        resizeMode: 'contain',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        height: 40,
        minHeight: 40,
        maxHeight: 40,
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 18,
        paddingVertical: 0,
        color: '#8e8e8e',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    categoryRow: {
        paddingTop: 16,
        paddingBottom: 2,
        gap: 20,
    },
    categoryItem: {
        alignItems: 'center',
        marginRight: 20,
    },
    tabLabel: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        color: '#4d4d4d',
    },
    tabLabelActive: {
        fontFamily: 'SF-Black',
        fontSize: 17,
        color: '#1b1b1b',
    },
    activeUnderline: {
        marginTop: 2,
        height: 3,
        width: '100%',
        borderRadius: 999,
        backgroundColor: '#8294FF',
    },
    sectionWrap: {
        marginTop: 28,
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
        color: '#202020',
    },
    hotelPrice: {
        fontFamily: 'SF-Bold',
        fontSize: 15,
        color: '#202020',
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
        fontSize: 13,
        color: '#7e7e7e',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 1,
    },
    hotelRating: {
        marginLeft: 3,
        fontFamily: 'SF-Regular',
        fontSize: 13,
        color: '#7e7e7e',
    },
    emptyText: {
        fontFamily: 'SF-Regular',
        fontSize: 14,
        color: '#7e7e7e',
        paddingVertical: 8,
    },
});
