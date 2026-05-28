import React, {useEffect, useMemo, useState} from 'react';
import {Alert, Image, Keyboard, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {getSession} from '../../../utils/authStorage';
import {CustomerService} from '../../../services/CustomerService';

const HISTORY_BOOKINGS_KEY = 'customer_paid_history_bookings';
const UPCOMING_BOOKINGS_KEY = 'customer_paid_upcoming_bookings';
const WATCHLIST_CUSTOM_POSTS_KEY = 'customer_watchlist_custom_posts';

const normalizeBookingId = (value) => {
    const normalized = String(value || '').trim().replace(/\s+/g, '').toUpperCase();
    if (!normalized) return '';
    return normalized.startsWith('#') ? normalized : `#${normalized}`;
};

export default function CustomerAddPostScreen({navigation}) {
    const [currentUser, setCurrentUser] = useState({name: 'Guest', email: ''});
    const [bookingRecords, setBookingRecords] = useState([]);
    const [bookingIdInput, setBookingIdInput] = useState('');
    const [matchedBooking, setMatchedBooking] = useState(null);
    const [draftImageUri, setDraftImageUri] = useState('');
    const [draftComment, setDraftComment] = useState('');
    const [draftRating, setDraftRating] = useState(0);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
            setKeyboardHeight(event?.endCoordinates?.height || 0);
        });
        const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    useEffect(() => {
        let mounted = true;

        const loadBookingRecords = async () => {
            try {
                const [session, rawHistory, rawUpcoming] = await Promise.all([
                    getSession(),
                    AsyncStorage.getItem(HISTORY_BOOKINGS_KEY),
                    AsyncStorage.getItem(UPCOMING_BOOKINGS_KEY),
                ]);

                const userEmail = String(session?.user?.email || '').trim().toLowerCase();
                const userName = String(session?.user?.name || session?.user?.full_name || 'Guest').trim() || 'Guest';

                if (mounted) {
                    setCurrentUser({name: userName, email: userEmail});
                }

                const parsedHistory = rawHistory ? JSON.parse(rawHistory) : [];
                const parsedUpcoming = rawUpcoming ? JSON.parse(rawUpcoming) : [];
                const allHistory = Array.isArray(parsedHistory)
                    ? parsedHistory.filter((item) => item && typeof item === 'object' && item.id)
                    : [];
                const allUpcoming = Array.isArray(parsedUpcoming)
                    ? parsedUpcoming.filter((item) => item && typeof item === 'object' && item.id)
                    : [];

                const scopedHistory = userEmail
                    ? allHistory.filter((item) => String(item?.customerEmail || '').trim().toLowerCase() === userEmail)
                    : allHistory;
                const scopedUpcoming = userEmail
                    ? allUpcoming.filter((item) => String(item?.customerEmail || '').trim().toLowerCase() === userEmail)
                    : allUpcoming;

                const deduped = new Map();
                [...scopedHistory, ...scopedUpcoming].forEach((item) => {
                    const bookingId = normalizeBookingId(item?.bookingId);
                    const hotelName = String(item?.roomCode || item?.hotelName || 'Hotel').trim();
                    const roomName = String(item?.roomName || 'Room').trim();
                    const key = bookingId || `${hotelName}::${roomName}`;

                    if (!deduped.has(key)) {
                        deduped.set(key, {
                            bookingId,
                            hotelName,
                            roomName,
                            image: item?.image || '',
                        });
                    }
                });

                if (mounted) {
                    setBookingRecords(Array.from(deduped.values()));
                }
            } catch {
                if (mounted) {
                    setBookingRecords([]);
                }
            }
        };

        loadBookingRecords();

        return () => {
            mounted = false;
        };
    }, []);

    const bookingCountText = useMemo(() => {
        return `${bookingRecords.length} verified booking(s) available`;
    }, [bookingRecords.length]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
        }, 600);
    };

    const handleVerifyBookingId = () => {
        const normalized = normalizeBookingId(bookingIdInput);
        if (!normalized) {
            Alert.alert('Booking ID required', 'Please enter your Booking ID first.');
            return;
        }

        const found = bookingRecords.find((item) => normalizeBookingId(item?.bookingId) === normalized);
        if (!found) {
            setMatchedBooking(null);
            Alert.alert('Invalid Booking ID', 'Booking ID not found for your account.');
            return;
        }

        setMatchedBooking(found);
        setBookingIdInput(normalized);
    };

    const handleCapturePhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Camera permission required', 'Please allow camera permission to take a photo.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
            setDraftImageUri(result.assets[0].uri);
        }
    };

    const handlePickFromLibrary = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Library permission required', 'Please allow photo library permission to choose an image.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
            setDraftImageUri(result.assets[0].uri);
        }
    };

    const handlePost = async () => {
        const content = draftComment.trim();

        if (!matchedBooking) {
            Alert.alert('Verify Booking ID', 'Please verify a valid Booking ID before posting.');
            return;
        }
        if (!draftImageUri) {
            Alert.alert('Missing photo', 'Please take a photo or choose one from your gallery.');
            return;
        }
        if (content.length < 3) {
            Alert.alert('Missing comment', 'Please enter a short comment for your post.');
            return;
        }
        if (draftRating < 1) {
            Alert.alert('Missing rating', 'Please choose a star rating before posting.');
            return;
        }

        const id = `watch-custom-${Date.now()}`;

        try {
            const rawCustomPosts = await AsyncStorage.getItem(WATCHLIST_CUSTOM_POSTS_KEY);
            const parsedCustomPosts = rawCustomPosts ? JSON.parse(rawCustomPosts) : [];
            const safeCustomPosts = Array.isArray(parsedCustomPosts)
                ? parsedCustomPosts.filter((item) => item && typeof item === 'object')
                : [];

            const persistedPost = {
                id,
                bookingId: normalizeBookingId(matchedBooking.bookingId),
                hotelName: matchedBooking.hotelName,
                roomName: matchedBooking.roomName,
                description: content,
                image: draftImageUri,
                rating: draftRating,
                userName: currentUser.name || 'Guest',
                customerEmail: currentUser.email || '',
                createdAt: new Date().toISOString(),
            };

            await CustomerService.createWatchlistPost(persistedPost);

            await AsyncStorage.setItem(WATCHLIST_CUSTOM_POSTS_KEY, JSON.stringify([persistedPost, ...safeCustomPosts]));
            Alert.alert('Success', 'Post added to Watchlist.', [
                {text: 'OK', onPress: () => navigation.goBack()},
            ]);
        } catch {
            Alert.alert('Error', 'Unable to save your post. Please try again.');
        }
    };

    return (
        <SafeAreaView style={styles.page}>
            <KeyboardAvoidingView
                style={styles.keyboardWrap}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
            >
                <ScrollView
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={[styles.content, {paddingBottom: Math.max(24, keyboardHeight + 24)}]}
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
                        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={22} color="#1f1f1f"/>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Customer Add Post</Text>
                        <View style={styles.iconBtn} />
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.label}>Booking ID</Text>
                        <View style={styles.bookingInputRow}>
                            <TextInput
                                value={bookingIdInput}
                                onChangeText={(text) => {
                                    setBookingIdInput(text);
                                    setMatchedBooking(null);
                                }}
                                placeholder="Enter Booking ID (e.g. #BK862345)"
                                placeholderTextColor="#9a9a9a"
                                autoCapitalize="characters"
                                style={styles.bookingInput}
                            />
                            <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyBookingId} activeOpacity={0.9}>
                                <Text style={styles.verifyBtnText}>Verify</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.hintText}>{bookingCountText}</Text>

                        {matchedBooking ? (
                            <View style={styles.verifiedCard}>
                                <Text style={styles.verifiedTitle}>Booking Verified</Text>
                                <Text style={styles.verifiedLine}>Booking ID: {normalizeBookingId(matchedBooking.bookingId) || 'N/A'}</Text>
                                <Text style={styles.verifiedLine}>Hotel: {matchedBooking.hotelName}</Text>
                                <Text style={styles.verifiedLine}>Room: {matchedBooking.roomName}</Text>
                            </View>
                        ) : null}

                        <Text style={styles.label}>Photo</Text>
                        <View style={styles.photoActionsRow}>
                            <TouchableOpacity style={styles.photoActionBtn} onPress={handleCapturePhoto} activeOpacity={0.86}>
                                <Ionicons name="camera-outline" size={18} color="#15398d"/>
                                <Text style={styles.photoActionText}>Take photo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.photoActionBtn} onPress={handlePickFromLibrary} activeOpacity={0.86}>
                                <Ionicons name="images-outline" size={18} color="#15398d"/>
                                <Text style={styles.photoActionText}>Choose photo</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.previewBox}>
                            {draftImageUri ? (
                                <Image source={{uri: draftImageUri}} style={styles.previewImage} resizeMode="cover"/>
                            ) : (
                                <Text style={styles.previewPlaceholder}>No photo selected</Text>
                            )}
                        </View>

                        <Text style={styles.label}>Comment</Text>
                        <TextInput
                            value={draftComment}
                            onChangeText={setDraftComment}
                            placeholder="Share your room experience..."
                            placeholderTextColor="#9a9a9a"
                            style={styles.commentInput}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />

                        <Text style={styles.label}>Rating</Text>
                        <View style={styles.ratingRow}>
                            {[1, 2, 3, 4, 5].map((value) => (
                                <TouchableOpacity
                                    key={`rating-${value}`}
                                    style={styles.starBtn}
                                    onPress={() => setDraftRating(value)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons
                                        name={value <= draftRating ? 'star' : 'star-outline'}
                                        size={30}
                                        color={value <= draftRating ? '#f5b301' : '#c8cedd'}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.ratingHintText}>
                            {draftRating > 0 ? `You rated ${draftRating}/5 stars` : 'Tap a star to rate your stay'}
                        </Text>

                        <TouchableOpacity style={styles.submitBtn} onPress={handlePost} activeOpacity={0.9}>
                            <Text style={styles.submitBtnText}>Post to Watchlist</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: '#eef1f6',
    },
    keyboardWrap: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 14,
        paddingTop: 6,
        paddingBottom: 24,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    iconBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 20,
        color: '#1d1d1f',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    label: {
        fontFamily: 'SF-Bold',
        fontSize: 14,
        color: '#313131',
        marginBottom: 8,
    },
    bookingInputRow: {
        flexDirection: 'row',
        gap: 8,
    },
    bookingInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d8dbe6',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: 'SF-Regular',
        fontSize: 14,
        color: '#1d1d1f',
    },
    verifyBtn: {
        borderRadius: 12,
        backgroundColor: '#1f4ec9',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
    },
    verifyBtnText: {
        fontFamily: 'SF-Bold',
        fontSize: 13,
        color: '#fff',
    },
    hintText: {
        fontFamily: 'SF-Regular',
        fontSize: 12,
        color: '#7b7b7b',
        marginTop: 6,
        marginBottom: 10,
    },
    verifiedCard: {
        borderWidth: 1,
        borderColor: '#cfe0ff',
        borderRadius: 12,
        backgroundColor: '#eef4ff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
    },
    verifiedTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 13,
        color: '#1946b0',
        marginBottom: 4,
    },
    verifiedLine: {
        fontFamily: 'SF-Regular',
        fontSize: 13,
        color: '#2b2f3a',
        marginBottom: 2,
    },
    photoActionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
    photoActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#c8d6ff',
        backgroundColor: '#edf2ff',
        paddingVertical: 10,
    },
    photoActionText: {
        fontFamily: 'SF-Bold',
        fontSize: 13,
        color: '#15398d',
    },
    previewBox: {
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#f2f2f2',
        height: 190,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    previewPlaceholder: {
        fontFamily: 'SF-Regular',
        fontSize: 14,
        color: '#8d8d8d',
    },
    commentInput: {
        borderWidth: 1,
        borderColor: '#d8dbe6',
        borderRadius: 12,
        minHeight: 104,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: 'SF-Regular',
        fontSize: 14,
        color: '#1d1d1f',
        marginBottom: 12,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    starBtn: {
        paddingVertical: 4,
        paddingHorizontal: 2,
    },
    ratingHintText: {
        marginTop: 4,
        marginBottom: 14,
        fontFamily: 'SF-Regular',
        fontSize: 12,
        color: '#6d7282',
    },
    submitBtn: {
        borderRadius: 999,
        backgroundColor: '#5b79df',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
    },
    submitBtnText: {
        fontFamily: 'SF-Bold',
        fontSize: 15,
        color: '#fff',
    },
});
