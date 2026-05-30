import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {AntDesign, Ionicons} from '@expo/vector-icons';
import RemoteImage from '../common/RemoteImage';
import Avatar from '../common/Avatar';

export function formatMoney(amount, currency) {
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    return `${safeAmount.toLocaleString('en-US')} ${currency ?? ''}`.trim();
}

export function FilterPill({icon, label, light = false, selected = false, onPress}) {
    const bgClass = selected ? 'bg-[#dfe4ff]' : light ? 'bg-[#eef0ff]' : 'bg-[#efefef]';
    const textClass = selected ? 'text-primary' : light ? 'text-primary' : 'text-extra';

    return (
        <TouchableOpacity
            className={`rounded-full px-4 py-3 mr-3 flex-row items-center ${bgClass}`}
            onPress={onPress}
            activeOpacity={0.8}
            accessibilityRole="button">
            {icon}
            <Text className={`text-sm font-sf ${textClass} ${icon ? 'ml-2' : ''}`}>{label}</Text>
        </TouchableOpacity>
    );
}

export function GalleryStrip({gallery}) {
    const items = (Array.isArray(gallery) ? gallery : [])
        .map((uri) => String(uri || '').trim())
        .filter(Boolean);

    if (!items.length) return null;

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-5" contentContainerStyle={styles.galleryRow}>
            {items.map((uri, index) => (
                <RemoteImage
                    key={`${uri}-${index}`}
                    uri={uri}
                    style={{width: 112, height: 96, borderRadius: 18, marginRight: 16}}
                    resizeMode="cover"
                />
            ))}
        </ScrollView>
    );
}

export function RatingRow({rating, reviews}) {
    const stars = Array.from({length: 5}, (_, index) => {
        const filled = rating >= index + 1;
        const halfFilled = !filled && rating >= index + 0.5;

        if (filled) {
            return <AntDesign key={`star-${index}`} name="star" size={18} color="#f5c542" style={styles.starIcon}/>;
        }

        if (halfFilled) {
            return <AntDesign key={`star-${index}`} name="staro" size={18} color="#f5c542" style={styles.starIcon}/>;
        }

        return <AntDesign key={`star-${index}`} name="staro" size={18} color="#e2e2e2" style={styles.starIcon}/>;
    });

    return (
        <View className="flex-row items-center mt-4 flex-wrap">
            <View className="flex-row items-center mr-3">{stars}</View>
            <Text className="font-sf-bold text-[17px] text-black mr-1">{rating.toFixed(1)}</Text>
            <Text className="font-sf text-[17px] text-[#c7c7c7]">-{reviews.toLocaleString('en-US')} Reviews</Text>
        </View>
    );
}

export function RoomCard({room, onViewDetail}) {
    const priceAmount = room?.price?.amount;
    const priceCurrency = room?.price?.currency ?? 'VND';
    const roomImage = String(room?.image || '').trim();

    return (
        <View className="rounded-[24px] bg-white p-3 mb-5 flex-row" style={styles.cardShadow}>
            <RemoteImage uri={roomImage} style={{width: 136, height: 116, borderRadius: 20}} resizeMode="cover" />
            <View className="flex-1 ml-3 justify-between">
                <View className="flex-row items-start justify-between">
                    <Text className="font-sf-bold text-[18px] text-black flex-1 pr-2">{room.name}</Text>
                    <Text className="font-sf-semi text-[13px] text-[#11b825]">{formatMoney(priceAmount, priceCurrency)}</Text>
                </View>

                <Text className="font-sf text-[13px] text-extra leading-5 mt-1" numberOfLines={2}>
                    {room.description}
                </Text>

                <View className="mt-1">
                    <Text className="font-sf text-[14px] text-extra">Type: <Text className="font-sf-bold text-extra">{room.type}</Text></Text>
                    <Text className="font-sf text-[14px] text-extra mt-1">Feature: <Text className="font-sf">View {room.view}</Text></Text>
                </View>

                <View className="flex-row justify-end items-center mt-2">
                    <TouchableOpacity onPress={onViewDetail}>
                        <Text className="font-sf-semi text-[15px] text-black mr-5">View Detail</Text>
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Text className="text-primary font-sf-semi text-[15px]">Book now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

export function PaginationRow() {
    return (
        <View className="flex-row justify-between mt-1 mb-3 px-4">
            <PaginationPill label="Prev"/>
            <PaginationPill label="Floor 1"/>
            <PaginationPill label="Next"/>
        </View>
    );
}

function PaginationPill({label}) {
    return (
        <TouchableOpacity className="bg-primary rounded-full px-8 py-3">
            <Text className="text-white font-sf text-base">{label}</Text>
        </TouchableOpacity>
    );
}

export function FeaturedTag({label, onRemove}) {
    return (
        <TouchableOpacity
            className="mt-1 mb-4 flex-row items-center self-start rounded-full bg-[#eef0ff] px-4 py-2"
            onPress={onRemove}
            activeOpacity={0.85}
            accessibilityRole="button">
            <Text className="font-sf text-[14px] text-primary mr-2">{label}</Text>
            <Ionicons name="close" size={18} color="#8294FF"/>
        </TouchableOpacity>
    );
}

export function WatchlistCard({watchlist}) {
    const imageUri = String(watchlist?.image || '').trim();
    const avatarUri = String(watchlist?.avatar || '').trim();
    const reviewerName = String(watchlist?.reviewer || 'Guest').trim() || 'Guest';

    return (
        <View className="rounded-[26px] bg-black p-4 mt-2 mb-8">
            <Text className="font-wendy text-[23px] text-[#e4ef27]">{watchlist.title}</Text>
            <Text className="text-white text-[14px] mt-1">{watchlist.subtitle}</Text>

            <View className="mt-4 rounded-[24px] overflow-hidden">
                <RemoteImage uri={imageUri} style={{width: '100%', height: 360}} resizeMode="cover" />
                <View style={styles.reviewBubble}>
                    <Text className="text-white text-[14px]">{watchlist.review}</Text>
                </View>
            </View>

            <View className="flex-row items-center justify-center mt-4">
                <Avatar uri={avatarUri} name={reviewerName} size={24} />
                <Text className="text-white text-[15px] ml-3">{reviewerName}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    cardShadow: {
        shadowColor: '#000000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 6,
    },
    galleryRow: {
        paddingRight: 8,
    },
    reviewBubble: {
        position: 'absolute',
        bottom: 16,
        alignSelf: 'center',
        backgroundColor: 'rgba(55, 55, 55, 0.86)',
        borderRadius: 999,
        paddingHorizontal: 18,
        paddingVertical: 8,
    },
    starIcon: {
        marginRight: 1,
    },
});
