import React, {useMemo, useState} from 'react';
import {Image, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';

const formatVnd = (amount) => Number(amount || 0).toLocaleString('en-US');

const PAYMENT_LOGOS = {
    momo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=1400&q=80&fm=jpg',
    zalo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=1400&q=80&fm=jpg',
};

export default function CustomerPaymentScreen({navigation, route}) {
    const {
        heroImage = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=1400&q=80&fm=jpg',
        hotelName = 'Swiss Hotel',
        roomName = 'Room 121',
        checkIn = "9h00' 23 Mar 2026",
        checkOut = "9h00' 24 Mar 2026",
        name = 'Nguyen Ngoc Lan',
        email = 'customer@nesto.vn',
        phone = 'N/A',
        totalAmount = 2475000,
        depositAmount = 495000,
        subtotalPrice = 2250000,
        vatAmount = 225000,
        pricePerHour = 50000,
        discountPerHour = 5000,
        stayTimeLabel = '24h00',
    } = route?.params ?? {};

    const [paymentMethod, setPaymentMethod] = useState('momo');

    const paymentRows = useMemo(
        () => [
            {id: 'momo', label: 'Payment by momo', logo: PAYMENT_LOGOS.momo},
            {id: 'zalo', label: 'Payment by ZaloPay', logo: PAYMENT_LOGOS.zalo},
        ],
        []
    );

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.heroWrap}>
                    <Image source={{uri: heroImage}} style={styles.heroImage} resizeMode="cover"/>
                    <View style={styles.heroActions}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.heroBtn}>
                            <Ionicons name="arrow-back" size={22} color="#222"/>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.heroBtn}>
                            <Ionicons name="ellipsis-horizontal" size={22} color="#222"/>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.cardTop}>
                    <Text style={styles.roomName}>{roomName}</Text>
                    <Text style={styles.hotelName}>{hotelName}</Text>
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={16} color="#f5c51a"/>
                        <Text style={styles.rating}>4.8</Text>
                        <Text style={styles.review}>- 4231 Reviews</Text>
                    </View>
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Order summary</Text>
                    <Text style={styles.sectionHint}>Check information order before payment</Text>

                    <View style={styles.row}><Text style={styles.label}>Name:</Text><Text style={styles.value}>{name}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Email:</Text><Text style={styles.value}>{email}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Phone number:</Text><Text style={styles.value}>{phone}</Text></View>
                    <View style={styles.divider}/>
                    <View style={styles.row}><Text style={styles.label}>Hotel:</Text><Text style={styles.value}>{hotelName}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Room:</Text><Text style={styles.value}>{roomName}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Check-in:</Text><Text style={styles.value}>{checkIn}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Check-out:</Text><Text style={styles.value}>{checkOut}</Text></View>
                    <View style={styles.divider}/>
                    <View style={styles.row}><Text style={styles.label}>Time:</Text><Text style={styles.value}>{stayTimeLabel}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Price:</Text><Text style={styles.value}>{formatVnd(pricePerHour)} VND/h</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Discount:</Text><Text style={styles.value}>{formatVnd(discountPerHour)} VND/h</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Price:</Text><Text style={styles.value}>{formatVnd(subtotalPrice)} VND</Text></View>
                    <View style={styles.row}><Text style={styles.label}>VAT (10%):</Text><Text style={styles.value}>{formatVnd(vatAmount)} VND</Text></View>
                    <View style={styles.divider}/>
                    <View style={styles.row}><Text style={styles.labelBold}>Total Price:</Text><Text style={styles.valueBold}>{formatVnd(totalAmount)} VND</Text></View>
                    <View style={styles.row}><Text style={styles.labelBold}>Deposit (20%):</Text><Text style={styles.valueBold}>{formatVnd(depositAmount)} VND</Text></View>
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Payment method</Text>
                    <Text style={styles.sectionHint}>Choose payment method to book room, you have 15 minutes to reserve a place</Text>

                    {paymentRows.map((item) => {
                        const selected = paymentMethod === item.id;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.payItem, selected ? styles.payItemActive : null]}
                                onPress={() => setPaymentMethod(item.id)}
                                activeOpacity={0.85}
                            >
                                <View style={styles.payBadgeWrap}>
                                    <Image source={item.logo} style={styles.payBadgeImage} resizeMode="cover"/>
                                </View>
                                <Text style={styles.payLabel}>{item.label}</Text>
                                {selected ? <Ionicons name="checkmark-circle" size={20} color="#8294FF"/> : null}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <TouchableOpacity style={styles.confirmBtn}>
                <Text style={styles.confirmBtnText}>Confirm payment</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    content: {
        paddingBottom: 110,
    },
    heroWrap: {
        marginHorizontal: 10,
        marginTop: 8,
        borderRadius: 24,
        overflow: 'hidden',
        height: 180,
        backgroundColor: '#ddd',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroActions: {
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    heroBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.88)',
    },
    cardTop: {
        marginTop: -30,
        marginHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 14,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    roomName: {
        fontSize: 38,
        lineHeight: 42,
        fontWeight: '800',
        color: '#181818',
    },
    hotelName: {
        fontSize: 17,
        color: '#8a8a8a',
        marginTop: 2,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    rating: {
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 4,
    },
    review: {
        fontSize: 16,
        color: '#9a9a9a',
        marginLeft: 4,
    },
    sectionCard: {
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 32,
        lineHeight: 36,
        fontWeight: '800',
        color: '#1f1f1f',
    },
    sectionHint: {
        fontSize: 14,
        color: '#8f8f8f',
        marginTop: 2,
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    label: {
        fontSize: 15,
        color: '#333',
    },
    value: {
        fontSize: 15,
        color: '#222',
        flex: 1,
        textAlign: 'right',
        marginLeft: 8,
    },
    labelBold: {
        fontSize: 15,
        color: '#222',
        fontWeight: '800',
    },
    valueBold: {
        fontSize: 15,
        color: '#222',
        fontWeight: '800',
        flex: 1,
        textAlign: 'right',
        marginLeft: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#d9d9d9',
        marginVertical: 6,
    },
    payItem: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d9d9d9',
        paddingHorizontal: 10,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: '#fff',
    },
    payItemActive: {
        borderColor: '#8294FF',
        backgroundColor: '#eef0ff',
    },
    payBadgeWrap: {
        width: 34,
        height: 34,
        borderRadius: 8,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        backgroundColor: 'transparent',
    },
    payBadgeImage: {
        width: '100%',
        height: '100%',
    },
    payLabel: {
        flex: 1,
        fontSize: 16,
        color: '#1f1f1f',
        fontWeight: '600',
    },
    confirmBtn: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 16,
        backgroundColor: '#8294FF',
        borderRadius: 999,
        paddingVertical: 14,
        alignItems: 'center',
        shadowColor: '#8294FF',
        shadowOpacity: 0.28,
        shadowRadius: 8,
        elevation: 5,
    },
    confirmBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '800',
    },
});