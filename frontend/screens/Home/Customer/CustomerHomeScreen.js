import {Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useMemo, useState} from 'react';
import {AntDesign, Feather, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {familyHotels, businessHotels} from '../../../configuration/hotelsData';
import {STAFF_MEDIA} from '../../../constants/staffMedia';

const tabs = ['ALL', 'Featured', 'Suite', 'View', 'Family', 'Business'];
const DEFAULT_HOTEL_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=1400&q=80&fm=jpg';

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
    const displayRating = Number.parseFloat(item?.rating || '0').toFixed(1);

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
                        <Text style={styles.hotelRating}>{displayRating}</Text>
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
                                        rating: Number.parseFloat(item?.rating || '0'),
                                        reviews: Number.parseInt(item?.reviews || '4231', 10),
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

export function HomeScreen({navigation}) {
    const {width} = useWindowDimensions();
    const horizontalPadding = 16;
    const gap = 12;
    const contentWidth = Math.max(width - horizontalPadding * 2, 240);
    const cardWidth = (contentWidth - gap) / 2;
    const bottomNavIconSize = 22;
    const [activeTab, setActiveTab] = useState('ALL');
    const [searchText, setSearchText] = useState('');

    const catalog = useMemo(
        () => [
            ...familyHotels.map((item) => ({...item, category: 'Family'})),
            ...businessHotels.map((item) => ({...item, category: 'Business'})),
        ],
        []
    );

    const filteredHotels = useMemo(() => {
        const byTab = filterHotelsByTab(activeTab, catalog);

        const keyword = searchText.trim().toLowerCase();
        if (!keyword) return byTab;

        return byTab.filter((item) => {
            const haystack = `${item.title} ${item.city} ${item.category}`.toLowerCase();
            return haystack.includes(keyword);
        });
    }, [activeTab, catalog, searchText]);

    const allTabOrder = ['Featured', 'Suite', 'View', 'Family', 'Business'];
    const allTabSections = useMemo(() => {
        return allTabOrder.map((tab) => ({
            title: tab,
            data: filterHotelsByTab(tab, catalog),
        }));
    }, [catalog]);

    return (
        <SafeAreaView style={styles.page}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerRow}>
                    <View style={styles.locationWrap}>
                        <Text style={styles.locationLabel}>Current Location</Text>
                        <Text style={styles.locationValue} numberOfLines={1}>Labuan Bajo, INA</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <View style={styles.bellWrap}>
                            <Ionicons name="notifications" size={20} color="#1f1f1f"/>
                            <View style={styles.alertDot}/>
                        </View>
                        <Image
                            source={{uri: STAFF_MEDIA.USER_PLACEHOLDER}}
                            style={styles.avatar}
                        />
                    </View>
                </View>

                <View style={styles.searchBox}>
                    <Image source={require('../../../assets/images/hotels/icon.png')} style={styles.aiSearchIcon}/>
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
                    <Section title={activeTab} data={filteredHotels} cardWidth={cardWidth} navigation={navigation}/>
                )}
            </ScrollView>

            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.bottomItem}>
                    <Ionicons name="home" size={bottomNavIconSize} color="#8294FF"/>
                    <Text style={[styles.bottomLabel, styles.bottomLabelActive]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomItem} onPress={() => navigation.navigate('CustomerBookingUpcomingScreen')}>
                    <MaterialCommunityIcons name="map-marker-radius-outline" size={bottomNavIconSize} color="#8f8f8f"/>
                    <Text style={styles.bottomLabel}>Booking</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomItem} onPress={() => navigation.navigate('CustomerLocketScreen')}>
                    <Ionicons name="heart-outline" size={bottomNavIconSize} color="#8f8f8f"/>
                    <Text style={styles.bottomLabel}>Watchlist</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomItem} onPress={() => navigation.navigate('CustomerProfileScreen')}>
                    <Feather name="user" size={bottomNavIconSize} color="#8f8f8f"/>
                    <Text style={styles.bottomLabel}>Profile</Text>
                </TouchableOpacity>
            </View>
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
    alertDot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        backgroundColor: '#ff3b30',
        position: 'absolute',
        top: 4,
        right: 4,
        borderWidth: 1,
        borderColor: '#efefef',
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
        width: 22,
        height: 22,
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
    bottomNav: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 76,
        borderTopWidth: 1,
        borderTopColor: '#d6d6d6',
        backgroundColor: '#f6f6f6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingBottom: 6,
    },
    bottomItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    bottomLabel: {
        marginTop: 4,
        fontFamily: 'SF-Regular',
        fontSize: 12,
        color: '#8f8f8f',
    },
    bottomLabelActive: {
        color: '#8294FF',
    },
});
