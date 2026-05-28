import {useEffect, useMemo, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {STAFF_MEDIA} from '../../../constants/staffMedia';
import {useCustomerProfile} from '../../../hooks/customer/useCustomerProfile';

const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';

const inferMimeType = (uri = '') => {
    const normalized = String(uri || '').toLowerCase();
    if (normalized.endsWith('.png')) return 'image/png';
    if (normalized.endsWith('.webp')) return 'image/webp';
    if (normalized.endsWith('.heic')) return 'image/heic';
    return 'image/jpeg';
};

const uploadAvatarToCloudinary = async (uri) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        throw new Error('Missing Cloudinary config. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET.');
    }

    const formData = new FormData();
    formData.append('file', {
        uri,
        type: inferMimeType(uri),
        name: `avatar-${Date.now()}.jpg`,
    });
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
    });

    const payload = await response.json();
    if (!response.ok || !payload?.secure_url) {
        const detail = payload?.error?.message || 'Cloudinary upload failed.';
        throw new Error(detail);
    }

    return String(payload.secure_url).trim();
};

export default function CustomerEditProfileScreen({navigation}) {
    const {profile, updateProfile, isSaving} = useCustomerProfile();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [avatar, setAvatar] = useState(STAFF_MEDIA.USER_PLACEHOLDER);
    const [pendingAvatarUri, setPendingAvatarUri] = useState('');
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    useEffect(() => {
        if (!profile) return;
        setName(String(profile?.name || '').trim());
        setEmail(String(profile?.email || '').trim());
        setPhone(String(profile?.phone || '').trim());
        setAvatar(String(profile?.avatar || '').trim() || STAFF_MEDIA.USER_PLACEHOLDER);
        setPendingAvatarUri('');
    }, [profile]);

    const saveDisabled = useMemo(() => {
        return !String(name || '').trim() || !String(email || '').trim() || isSaving || isUploadingAvatar;
    }, [name, email, isSaving, isUploadingAvatar]);

    const pickAvatar = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission denied', 'Allow photo library access to change your avatar.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
            const uri = String(result.assets[0].uri).trim();
            setAvatar(uri);
            setPendingAvatarUri(uri);
        }
    };

    const handleSave = async () => {
        const nextName = String(name || '').trim();
        const nextEmail = String(email || '').trim();
        const nextPhone = String(phone || '').trim();
        let nextAvatar = String(avatar || '').trim();

        if (!nextName) {
            Alert.alert('Validation', 'Name is required.');
            return;
        }

        if (!nextEmail) {
            Alert.alert('Validation', 'Email is required.');
            return;
        }

        if (pendingAvatarUri) {
            try {
                setIsUploadingAvatar(true);
                nextAvatar = await uploadAvatarToCloudinary(pendingAvatarUri);
            } catch (error) {
                Alert.alert('Avatar upload failed', String(error?.message || 'Unable to upload avatar right now.'));
                return;
            } finally {
                setIsUploadingAvatar(false);
            }
        }

        const result = await updateProfile({
            name: nextName,
            email: nextEmail,
            phone: nextPhone,
            avatar: nextAvatar,
        });

        if (!result?.success) {
            Alert.alert('Update failed', String(result?.error || 'Unable to update profile right now.'));
            return;
        }

        Alert.alert('Success', 'Profile updated successfully.', [
            {text: 'OK', onPress: () => navigation.goBack()},
        ]);
    };

    return (
        <SafeAreaView style={styles.page}>
            <KeyboardAvoidingView
                style={styles.keyboardWrap}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
            >
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={styles.headerRow}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={22} color="#1f1f1f" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Update Profile</Text>
                        <View style={styles.iconBtn} />
                    </View>

                    <View style={styles.avatarCard}>
                        <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85}>
                            <Image source={{uri: avatar || STAFF_MEDIA.USER_PLACEHOLDER}} style={styles.avatar} />
                            <View style={styles.cameraBadge}>
                                <Ionicons name="camera" size={14} color="#ffffff" />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.avatarHint}>Tap avatar to choose a new photo.</Text>
                        {isUploadingAvatar ? (
                            <View style={styles.uploadingRow}>
                                <ActivityIndicator size="small" color="#5b79df" />
                                <Text style={styles.uploadingText}>Uploading avatar...</Text>
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.formCard}>
                        <Text style={styles.fieldLabel}>Full Name</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter your full name"
                            placeholderTextColor="#9a9a9a"
                            style={styles.input}
                        />

                        <Text style={styles.fieldLabel}>Email</Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter your email"
                            placeholderTextColor="#9a9a9a"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            style={styles.input}
                        />

                        <Text style={styles.fieldLabel}>Phone Number</Text>
                        <TextInput
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Enter your phone number"
                            placeholderTextColor="#9a9a9a"
                            keyboardType="phone-pad"
                            style={styles.input}
                        />
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.saveBtn, saveDisabled ? styles.saveBtnDisabled : null]}
                        disabled={saveDisabled}
                        onPress={handleSave}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.saveBtnText}>{isSaving || isUploadingAvatar ? 'Saving...' : 'Save Profile'}</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: '#f4f4f4',
    },
    keyboardWrap: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f3f4f8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 18,
        color: '#1f1f1f',
    },
    avatarCard: {
        backgroundColor: '#fbfbfb',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e4e4e4',
        alignItems: 'center',
        paddingVertical: 16,
        marginBottom: 12,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 8,
    },
    cameraBadge: {
        position: 'absolute',
        right: -2,
        bottom: 4,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#5b79df',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    avatarHint: {
        fontFamily: 'SF-Regular',
        fontSize: 12,
        color: '#6b7280',
    },
    uploadingRow: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    uploadingText: {
        marginLeft: 8,
        fontFamily: 'SF-Regular',
        fontSize: 12,
        color: '#4b5563',
    },
    formCard: {
        backgroundColor: '#fbfbfb',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e4e4e4',
        padding: 14,
    },
    fieldLabel: {
        fontFamily: 'SF-Bold',
        fontSize: 13,
        color: '#2f2f2f',
        marginTop: 8,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#d7dbe5',
        borderRadius: 10,
        backgroundColor: '#ffffff',
        paddingHorizontal: 12,
        paddingVertical: 11,
        fontFamily: 'SF-Regular',
        fontSize: 14,
        color: '#1f1f1f',
    },
    footer: {
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        backgroundColor: '#f4f4f4',
    },
    saveBtn: {
        backgroundColor: '#5b79df',
        borderRadius: 12,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnDisabled: {
        opacity: 0.5,
    },
    saveBtnText: {
        fontFamily: 'SF-Bold',
        fontSize: 15,
        color: '#ffffff',
    },
});
