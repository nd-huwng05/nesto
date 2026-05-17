import {useState} from 'react';
import {
    Alert,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {Camera} from 'lucide-react-native';
import {FormScreenLayout} from '../../../components/common/FormScreenLayout';
import {DetailScreenHeader} from '../../../components/business/DetailScreenHeader';
import {useManagerProfile} from '../../../configuration/ManagerProfileContext';
import {commonInputStyles} from '../../../styles/TextInputStyles';
import {UI, cardStyle} from '../../../styles/uiTokens';

export default function EditProfileScreen({navigation}) {
    const {profile, updateProfile} = useManagerProfile();

    const [name, setName] = useState(profile.name);
    const [email, setEmail] = useState(profile.email);
    const [phone, setPhone] = useState(profile.phone);
    const [avatar, setAvatar] = useState(profile.avatar);
    const [saving, setSaving] = useState(false);

    const pickAvatar = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission Denied', 'Allow photo library access to change your avatar.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
            setAvatar(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Validation', 'Name is required.');
            return;
        }
        if (!email.trim()) {
            Alert.alert('Validation', 'Email is required.');
            return;
        }
        setSaving(true);
        await new Promise((r) => setTimeout(r, 400));
        updateProfile({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            avatar,
        });
        setSaving(false);
        Alert.alert('Saved', 'Your profile has been updated.', [
            {text: 'OK', onPress: () => navigation.goBack()},
        ]);
    };

    const saveButton = (
        <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
            className={`py-4 rounded-full items-center min-h-[52px] justify-center ${
                saving ? 'bg-gray-300' : 'bg-primary'
            }`}
        >
            <Text className="text-white font-sf-bold text-base">{saving ? 'Saving…' : 'Save Profile'}</Text>
        </TouchableOpacity>
    );

    return (
        <FormScreenLayout
            footer={saveButton}
            screenStyle={{backgroundColor: UI.screenBg}}
            footerBarStyle={{backgroundColor: UI.screenBg, borderTopColor: '#e5e7eb'}}
        >
            <DetailScreenHeader onBack={() => navigation.goBack()} title="Edit Profile" showDelete={false} />

            <View className="items-center mb-6">
                <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85}>
                    <Image source={{uri: avatar}} className="w-24 h-24 rounded-full bg-gray-200" />
                    <View className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full items-center justify-center border-2 border-white">
                        <Camera size={16} color="#fff" />
                    </View>
                </TouchableOpacity>
                <Text className="font-sf text-xs text-gray-400 mt-2">Tap to change photo</Text>
            </View>

            <View style={[styles.fieldCard, styles.fieldGap]}>
                <Text className="font-sf text-xs text-gray-500 mb-1.5">Full Name *</Text>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor="#94a3b8"
                    className="font-sf text-base text-slate-800"
                    style={commonInputStyles.baseInput}
                />
            </View>

            <View style={[styles.fieldCard, styles.fieldGap]}>
                <Text className="font-sf text-xs text-gray-500 mb-1.5">Email *</Text>
                <TextInput
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="email@company.com"
                    placeholderTextColor="#94a3b8"
                    className="font-sf text-base text-slate-800"
                    style={commonInputStyles.baseInput}
                />
            </View>

            <View style={styles.fieldCard}>
                <Text className="font-sf text-xs text-gray-500 mb-1.5">Phone</Text>
                <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="Phone number"
                    placeholderTextColor="#94a3b8"
                    className="font-sf text-base text-slate-800"
                    style={commonInputStyles.baseInput}
                />
            </View>
        </FormScreenLayout>
    );
}

const styles = StyleSheet.create({
    fieldCard: {
        ...cardStyle,
    },
    fieldGap: {
        marginBottom: 16,
    },
});
