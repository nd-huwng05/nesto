import React, {useEffect, useMemo, useState} from 'react';
import {Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Ionicons} from '@expo/vector-icons';
import {getSession} from '../../../utils/authStorage';
import CustomerBottomTabBar from '../../../components/customer/CustomerBottomTabBar';
import {createReviewForumPost, fetchReviewForumPosts, toggleReviewForumHeart} from '../../../services/ReviewForumService';

const REVIEW_FORUM_KEY = 'customer_room_review_forum_posts';

const normalizeScopePart = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const buildScope = ({hotelName, roomName}) => ({
    hotelName: String(hotelName || '').trim(),
    roomName: String(roomName || '').trim(),
    scopeKey: `${normalizeScopePart(hotelName)}::${normalizeScopePart(roomName)}`,
});

const formatRelativeTime = (isoTime, nowMs) => {
    const timeMs = Date.parse(String(isoTime || ''));
    if (!Number.isFinite(timeMs)) return 'Just now';

    const diffSeconds = Math.max(0, Math.floor((nowMs - timeMs) / 1000));
    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return `${Math.floor(diffHours / 24)}d ago`;
};

const normalizeReviewPost = (post) => {
    const likedByIds = Array.isArray(post?.liked_by_ids)
        ? post.liked_by_ids
        : Array.isArray(post?.likedBy)
        ? post.likedBy
        : [];

    return {
        id: String(post?.id || ''),
        scopeKey: String(post?.scope_key || post?.scopeKey || '').trim(),
        hotelName: String(post?.hotel_name || post?.hotelName || '').trim(),
        roomName: String(post?.room_name || post?.roomName || '').trim(),
        bookingId: String(post?.booking_id || post?.bookingId || '').trim(),
        content: String(post?.content || '').trim(),
        authorName: String(post?.author_name || post?.authorName || 'Guest').trim() || 'Guest',
        createdAt: String(post?.created_at || post?.createdAt || new Date().toISOString()),
        likedBy: likedByIds.map((value) => String(value || '').trim()).filter(Boolean),
        heartsCount: Number(post?.hearts_count ?? post?.heartsCount ?? likedByIds.length) || 0,
        likedByMe: Boolean(post?.liked_by_me ?? post?.likedByMe ?? false),
    };
};

export default function CustomerReviewScreen({navigation, route}) {
    const scope = useMemo(
        () => buildScope({
            hotelName: route?.params?.hotelName || route?.params?.roomCode || '',
            roomName: route?.params?.roomName || '',
        }),
        [route?.params?.hotelName, route?.params?.roomCode, route?.params?.roomName]
    );

    const [reviewDraft, setReviewDraft] = useState('');
    const [reviewPosts, setReviewPosts] = useState([]);
    const [reviewNow, setReviewNow] = useState(Date.now());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewer, setViewer] = useState({id: '', name: 'Guest', email: ''});

    useEffect(() => {
        let mounted = true;

        const loadViewer = async () => {
            try {
                const session = await getSession();
                const user = session?.user || {};
                const email = String(user?.email || '').trim().toLowerCase();
                const name = String(user?.name || user?.full_name || 'Guest').trim() || 'Guest';
                const id = String(user?.id || email || name).trim().toLowerCase();

                if (mounted) {
                    setViewer({id, name, email});
                }
            } catch {
                if (mounted) setViewer({id: '', name: 'Guest', email: ''});
            }
        };

        loadViewer();
        return () => {
            mounted = false;
        };
    }, []);

    const loadPosts = async (showRefresh = false) => {
        if (!scope.scopeKey || !scope.hotelName || !scope.roomName) {
            setReviewPosts([]);
            setLoading(false);
            setRefreshing(false);
            return;
        }

        if (showRefresh) setRefreshing(true);

        try {
            const remotePosts = await fetchReviewForumPosts({
                hotelName: scope.hotelName,
                roomName: scope.roomName,
            });

            const normalized = remotePosts
                .map(normalizeReviewPost)
                .filter((post) => post.scopeKey === scope.scopeKey)
                .sort((left, right) => (Date.parse(right?.createdAt || 0) || 0) - (Date.parse(left?.createdAt || 0) || 0));

            await AsyncStorage.setItem(REVIEW_FORUM_KEY, JSON.stringify(normalized));
            setReviewPosts(normalized);
        } catch {
            const rawLocal = await AsyncStorage.getItem(REVIEW_FORUM_KEY);
            const parsedLocal = rawLocal ? JSON.parse(rawLocal) : [];
            const safeLocal = Array.isArray(parsedLocal)
                ? parsedLocal.map(normalizeReviewPost).filter((post) => post && typeof post === 'object')
                : [];
            setReviewPosts(
                safeLocal
                    .filter((post) => post.scopeKey === scope.scopeKey)
                    .sort((left, right) => (Date.parse(right?.createdAt || 0) || 0) - (Date.parse(left?.createdAt || 0) || 0))
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        loadPosts(false);
    }, [scope.scopeKey]);

    useEffect(() => {
        const refreshTimer = setInterval(() => {
            setReviewNow(Date.now());
        }, 30000);

        const feedTimer = setInterval(() => {
            loadPosts(false);
        }, 10000);

        return () => {
            clearInterval(refreshTimer);
            clearInterval(feedTimer);
        };
    }, [scope.scopeKey]);

    const handleSubmitReview = async () => {
        const content = reviewDraft.trim();

        if (content.length < 8) {
            Alert.alert('Review', 'Please write at least 8 characters for your review.');
            return;
        }

        try {
            await createReviewForumPost({
                hotelName: scope.hotelName,
                roomName: scope.roomName,
                content,
                bookingId: String(route?.params?.bookingId || '').trim(),
            });

            setReviewDraft('');
            setReviewNow(Date.now());
            await loadPosts(false);
        } catch (error) {
            try {
                const nowIso = new Date().toISOString();
                const rawPosts = await AsyncStorage.getItem(REVIEW_FORUM_KEY);
                const parsedPosts = rawPosts ? JSON.parse(rawPosts) : [];
                const safePosts = Array.isArray(parsedPosts)
                    ? parsedPosts.filter((post) => post && typeof post === 'object')
                    : [];

                const localPost = normalizeReviewPost({
                    id: `review-local-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                    scope_key: scope.scopeKey,
                    hotel_name: scope.hotelName,
                    room_name: scope.roomName,
                    booking_id: String(route?.params?.bookingId || '').trim(),
                    content,
                    author_name: viewer.name,
                    created_at: nowIso,
                    liked_by_ids: [],
                    hearts_count: 0,
                    liked_by_me: false,
                });

                const merged = [localPost, ...safePosts.map(normalizeReviewPost)]
                    .filter((post) => post.scopeKey === scope.scopeKey)
                    .sort((left, right) => (Date.parse(right?.createdAt || 0) || 0) - (Date.parse(left?.createdAt || 0) || 0));

                await AsyncStorage.setItem(REVIEW_FORUM_KEY, JSON.stringify(merged));
                setReviewDraft('');
                setReviewPosts(merged);
            } catch {
                Alert.alert('Review', String(error?.message || 'Unable to submit your review right now. Please try again.'));
            }
        }
    };

    const handleToggleHeart = async (postId) => {
        try {
            const updatedPost = await toggleReviewForumHeart(postId);
            const normalizedPost = normalizeReviewPost(updatedPost || {});
            setReviewPosts((prev) => prev.map((post) => (String(post?.id) === String(postId) ? normalizedPost : post)));
        } catch (error) {
            const viewerId = String(viewer?.id || '').trim().toLowerCase();
            if (!viewerId) {
                Alert.alert('Review', String(error?.message || 'Unable to update reaction right now. Please try again.'));
                return;
            }

            setReviewPosts((prev) => prev.map((post) => {
                if (String(post?.id) !== String(postId)) return post;
                const likedBy = Array.isArray(post?.likedBy) ? post.likedBy : [];
                const liked = likedBy.includes(viewerId);
                const nextLikedBy = liked ? likedBy.filter((id) => id !== viewerId) : [...likedBy, viewerId];
                return {
                    ...post,
                    likedBy: nextLikedBy,
                    heartsCount: nextLikedBy.length,
                    likedByMe: !liked,
                };
            }));
        }
    };

    return (
        <SafeAreaView style={styles.page}>
            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color="#20242d" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Review Forum</Text>
                <View style={styles.headerGap} />
            </View>

            <View style={styles.scopeCard}>
                <Text style={styles.scopeHotel}>{scope.hotelName || 'Hotel'}</Text>
                <Text style={styles.scopeRoom}>{scope.roomName || 'Room'}</Text>
                <Text style={styles.scopeHint}>Only guests with the same hotel and room type can view and interact in this forum.</Text>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadPosts(true)}
                        colors={['#5b79df']}
                        tintColor="#5b79df"
                    />
                }
            >
                <View style={styles.composerCard}>
                    <Text style={styles.composerLabel}>Share Your Experience</Text>
                    <TextInput
                        value={reviewDraft}
                        onChangeText={setReviewDraft}
                        style={styles.composerInput}
                        placeholder="For example: clean room, friendly staff, tasty food..."
                        placeholderTextColor="#9398a8"
                        multiline
                        textAlignVertical="top"
                    />
                    <TouchableOpacity
                        style={[styles.postBtn, reviewDraft.trim().length < 8 ? styles.postBtnDisabled : null]}
                        onPress={handleSubmitReview}
                        disabled={reviewDraft.trim().length < 8}
                    >
                        <Text style={styles.postBtnText}>Post Review</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <Text style={styles.emptyText}>Loading reviews...</Text>
                ) : reviewPosts.length ? reviewPosts.map((post) => {
                    const isLiked = Boolean(post?.likedByMe) || (Array.isArray(post?.likedBy) ? post.likedBy.includes(String(viewer?.id || '').trim().toLowerCase()) : false);
                    const heartsCount = Number(post?.heartsCount ?? (Array.isArray(post?.likedBy) ? post.likedBy.length : 0)) || 0;

                    return (
                        <View key={post.id} style={styles.postCard}>
                            <View style={styles.postHead}>
                                <Text style={styles.authorName}>{post.authorName || 'Guest'}</Text>
                                <Text style={styles.postTime}>{formatRelativeTime(post.createdAt, reviewNow)}</Text>
                            </View>
                            <Text style={styles.postContent}>{post.content}</Text>
                            <TouchableOpacity style={styles.heartBtn} onPress={() => handleToggleHeart(post.id)}>
                                <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={18} color={isLiked ? '#ef4d7a' : '#6e7486'} />
                                <Text style={[styles.heartText, isLiked ? styles.heartTextActive : null]}>{heartsCount} {heartsCount === 1 ? 'heart' : 'hearts'}</Text>
                            </TouchableOpacity>
                        </View>
                    );
                }) : (
                    <Text style={styles.emptyText}>No reviews yet. Be the first to share your experience for this room type.</Text>
                )}
            </ScrollView>

            <CustomerBottomTabBar navigation={navigation} activeTab="Booking" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: '#efefef',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 10,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f3f4f8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 24,
        color: '#1a1b22',
    },
    headerGap: {
        width: 36,
        height: 36,
    },
    scopeCard: {
        marginHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e6e8f1',
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 10,
    },
    scopeHotel: {
        fontFamily: 'SF-Bold',
        fontSize: 18,
        color: '#20242e',
    },
    scopeRoom: {
        marginTop: 2,
        fontFamily: 'SF-Semibold',
        fontSize: 14,
        color: '#5d6476',
    },
    scopeHint: {
        marginTop: 8,
        fontFamily: 'SF-Regular',
        fontSize: 12,
        lineHeight: 17,
        color: '#72798c',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 108,
        gap: 10,
    },
    composerCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e6e8f1',
        backgroundColor: '#fff',
        padding: 12,
    },
    composerLabel: {
        fontFamily: 'SF-Bold',
        fontSize: 15,
        color: '#222630',
        marginBottom: 8,
    },
    composerInput: {
        minHeight: 92,
        borderWidth: 1,
        borderColor: '#e3e6f0',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingTop: 10,
        fontFamily: 'SF-Regular',
        fontSize: 14,
        color: '#1f2430',
        marginBottom: 10,
        backgroundColor: '#fafbff',
    },
    postBtn: {
        height: 44,
        borderRadius: 12,
        backgroundColor: '#8294FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    postBtnDisabled: {
        opacity: 0.55,
    },
    postBtnText: {
        fontFamily: 'SF-Semibold',
        fontSize: 15,
        color: '#fff',
    },
    postCard: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e8ebf3',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    postHead: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    authorName: {
        fontFamily: 'SF-Bold',
        fontSize: 14,
        color: '#212530',
    },
    postTime: {
        fontFamily: 'SF-Regular',
        fontSize: 12,
        color: '#7a8193',
    },
    postContent: {
        fontFamily: 'SF-Regular',
        fontSize: 14,
        lineHeight: 20,
        color: '#333945',
        marginBottom: 10,
    },
    heartBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
    },
    heartText: {
        fontFamily: 'SF-Semibold',
        fontSize: 12,
        color: '#6e7486',
    },
    heartTextActive: {
        color: '#ef4d7a',
    },
    emptyText: {
        marginTop: 24,
        textAlign: 'center',
        fontFamily: 'SF-Regular',
        fontSize: 13,
        lineHeight: 19,
        color: '#7f8597',
    },
});
