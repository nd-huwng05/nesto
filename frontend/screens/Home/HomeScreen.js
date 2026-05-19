import {Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useState} from 'react';
import {AntDesign, Feather, Ionicons, MaterialCommunityIcons, MaterialIcons} from '@expo/vector-icons';
import {familyHotels, businessHotels} from '../../configuration/hotelsData';

const tabs = ['AI', 'Featured', 'Suite', 'View', 'Family', 'Business'];

function HotelCard({item, onPress, cardWidth}) {
    return (
        <TouchableOpacity style={[styles.hotelCard, {width: cardWidth}]} activeOpacity={0.92} onPress={onPress}>
            <Image source={{uri: item.image}} style={styles.hotelImage} resizeMode="cover"/>
            <View style={styles.hotelMeta}>
                <View style={styles.hotelTitleRow}>
                    <Text style={styles.hotelTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.hotelPrice} numberOfLines={1}>{item.price}</Text>
                </View>
                <View style={styles.hotelInfoRow}>
                    <Text style={styles.hotelCity} numberOfLines={1}>{item.city}</Text>
                    <View style={styles.ratingRow}>
                        <AntDesign name="star" size={12} color="#f5c51a"/>
                        <Text style={styles.hotelRating}>{item.rating}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

function CategoryTabs() {
    const [activeWidth, setActiveWidth] = useState(0);
    
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {tabs.map((tab, index) => (
                <View key={tab} style={styles.categoryItem}>
                    <Text 
                        style={[styles.tabLabel, index === 1 ? styles.tabLabelActive : null]}
                        onLayout={index === 1 ? (e) => setActiveWidth(e.nativeEvent.layout.width) : null}
                    >
                        {tab}
                    </Text>
                    {index === 1 ? <View style={[styles.activeUnderline, { width: activeWidth }]}/> : null}
                </View>
            ))}
        </ScrollView>
    );
}

function Section({title, data, cardWidth, navigation}) {
    return (
        <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.cardGrid}>
                {data.map((item) => (
                    <HotelCard
                        key={item.id}
                        item={item}
                        cardWidth={cardWidth}
                        onPress={() => navigation.navigate('HomeDetailScreen', {room: {name: item.title, image: item.image}})}
                    />
                ))}
            </View>
        </View>
    );
}

export function HomeScreen({navigation}) {
    const {width} = useWindowDimensions();
    const horizontalPadding = 16;
    const gap = 12;
    const contentWidth = Math.max(width - horizontalPadding * 2, 240);
    const cardWidth = (contentWidth - gap) / 2;
    const bottomNavIconSize = 22;

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
                            source={{uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=160&q=80'}}
                            style={styles.avatar}
                        />
                    </View>
                </View>

                <View style={styles.searchBox}>
                    <Feather name="aperture" size={16} color="#8e8e8e"/>
                    <Text style={styles.searchPlaceholder}>AI will find room you want</Text>
                </View>

                <CategoryTabs/>

                <Section title="Family" data={familyHotels} cardWidth={cardWidth} navigation={navigation}/>
                <Section title="Business" data={businessHotels} cardWidth={cardWidth} navigation={navigation}/>
            </ScrollView>

            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.bottomItem}>
                    <Ionicons name="home" size={bottomNavIconSize} color="#8294FF"/>
                    <Text style={[styles.bottomLabel, styles.bottomLabelActive]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomItem}>
                    <MaterialCommunityIcons name="map-marker-radius-outline" size={bottomNavIconSize} color="#8f8f8f"/>
                    <Text style={styles.bottomLabel}>Booking</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomItem}>
                    <Ionicons name="heart-outline" size={bottomNavIconSize} color="#8f8f8f"/>
                    <Text style={styles.bottomLabel}>Watchlist</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomItem}>
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
    },
    locationWrap: {
        flex: 1,
        paddingRight: 12,
    },
    locationLabel: {
        fontFamily: 'SF-Regular',
        fontSize: 12,
        color: '#272727',
    },
    locationValue: {
        fontFamily: 'SF-Bold',
        fontSize: 22,
        lineHeight: 26,
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
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#4a4a4a',
        borderRadius: 18,
        minHeight: 42,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        backgroundColor: '#f2f2f2',
    },
    searchPlaceholder: {
        marginLeft: 8,
        fontFamily: 'SF-Regular',
        fontSize: 16,
        color: '#8e8e8e',
    },
    categoryRow: {
        paddingTop: 14,
        paddingBottom: 4,
        gap: 20,
    },
    categoryItem: {
        alignItems: 'center',
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
        gap: 12,
    },
    hotelCard: {
        flex: 1,
        minWidth: 0,
        backgroundColor: '#dddddd',
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
