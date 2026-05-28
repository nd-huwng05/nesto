import {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import * as Location from 'expo-location';
import {useCustomerProfile} from '../../../hooks/customer/useCustomerProfile';

export default function CustomerEditProfileScreen({navigation}) {
    const {profile, isLoading, isSaving, loadProfile, updateProfile} = useCustomerProfile();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [preferredLocation, setPreferredLocation] = useState('');
    const [preferredLatitude, setPreferredLatitude] = useState(null);
    const [preferredLongitude, setPreferredLongitude] = useState(null);
    const [isLocating, setIsLocating] = useState(false);

    useEffect(() => {
        loadProfile().catch(() => Alert.alert('Profile', 'Unable to load profile right now. Please try again.'));
    }, [loadProfile]);

    useEffect(() => {
        setName(String(profile?.name || '').trim());
        setPhone(String(profile?.phone || '').trim());
        setPreferredLocation(String(profile?.preferredLocation || '').trim());
        setPreferredLatitude(profile?.preferredLatitude ?? null);
        setPreferredLongitude(profile?.preferredLongitude ?? null);
    }, [profile?.name, profile?.phone]);

    const canSave = useMemo(() => {
        if (isLoading || isSaving) return false;
        const n = String(name || '').trim();
        if (!n) return false;
        return true;
    }, [isLoading, isSaving, name]);

    const handleSave = async () => {
        if (!canSave) return;
        const res = await updateProfile({name, phone, preferredLocation, preferredLatitude, preferredLongitude});
        if (res?.success) {
            Alert.alert('Profile', 'Profile updated.');
            navigation.goBack();
            return;
        }
        Alert.alert('Profile', String(res?.error || 'Unable to update profile.'));
    };

    const handleUseCurrentLocation = async () => {
        setIsLocating(true);
        try {
            const perm = await Location.requestForegroundPermissionsAsync();
            if (perm.status !== 'granted') {
                Alert.alert('Location', 'Location permission was denied.');
                return;
            }
            const current = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
            const latitude = Number(current?.coords?.latitude);
            const longitude = Number(current?.coords?.longitude);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                Alert.alert('Location', 'Unable to detect your location.');
                return;
            }
            setPreferredLatitude(latitude);
            setPreferredLongitude(longitude);
            const reverse = await Location.reverseGeocodeAsync({latitude, longitude});
            const first = Array.isArray(reverse) && reverse.length ? reverse[0] : null;
            const city = String(first?.city || first?.subregion || first?.region || '').trim();
            const country = String(first?.country || '').trim();
            const label = [city, country].filter(Boolean).join(', ');
            setPreferredLocation(label || 'Unknown location');
        } catch {
            Alert.alert('Location', 'Unable to detect your location.');
        } finally {
            setIsLocating(false);
        }
    };

    return (
        <SafeAreaView style={styles.page}>
            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={22} color="#1f1f1f" />
                </TouchableOpacity>
                <Text style={styles.title}>Edit profile</Text>
                <View style={styles.rightSlot} />
            </View>

            {isLoading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color="#5b79df" />
                </View>
            ) : (
                <View style={styles.form}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Your name" placeholderTextColor="#9aa0ae" />
                    <Text style={styles.label}>Phone</Text>
                    <TextInput value={phone} onChangeText={setPhone} style={styles.input} placeholder="Phone number" placeholderTextColor="#9aa0ae" keyboardType="phone-pad" />
                    <Text style={styles.sectionTitle}>Location preference</Text>
                    <TextInput value={preferredLocation} onChangeText={setPreferredLocation} style={styles.input} placeholder="Default location" placeholderTextColor="#9aa0ae" />
                    <TouchableOpacity style={styles.secondaryBtn} onPress={handleUseCurrentLocation} disabled={isLocating}>
                        {isLocating ? <ActivityIndicator color="#111827" /> : <Text style={styles.secondaryText}>Use current location</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.saveBtn, !canSave ? styles.saveBtnDisabled : null]} onPress={handleSave} disabled={!canSave}>
                        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    page: {flex: 1, backgroundColor: '#f4f4f4', paddingHorizontal: 16, paddingTop: 8},
    headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8},
    backBtn: {width: 40, height: 40, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center'},
    rightSlot: {width: 40, height: 40},
    title: {fontFamily: 'SF-Bold', fontSize: 16, color: '#1f1f1f'},
    loadingWrap: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    form: {marginTop: 10, backgroundColor: '#fff', borderRadius: 18, padding: 14},
    label: {fontFamily: 'SF-SemiBold', color: '#1f1f1f', fontSize: 13, marginTop: 10},
    sectionTitle: {fontFamily: 'SF-Bold', color: '#1f1f1f', fontSize: 14, marginTop: 16},
    input: {marginTop: 8, height: 44, borderRadius: 14, paddingHorizontal: 12, backgroundColor: '#f3f4f6', color: '#111827', fontFamily: 'SF-Regular'},
    secondaryBtn: {marginTop: 10, height: 44, borderRadius: 14, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center'},
    secondaryText: {color: '#111827', fontFamily: 'SF-SemiBold'},
    saveBtn: {marginTop: 16, height: 46, borderRadius: 16, backgroundColor: '#5b79df', alignItems: 'center', justifyContent: 'center'},
    saveBtnDisabled: {opacity: 0.5},
    saveText: {color: '#fff', fontFamily: 'SF-Bold'},
});

