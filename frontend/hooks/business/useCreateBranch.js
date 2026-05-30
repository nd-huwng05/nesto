import {useMemo, useState, useEffect} from 'react';
import {Alert, Keyboard} from 'react-native';
import {createBranch, fetchAmenityOptions, fetchCatalogThemes, fetchGuestSegments} from '../../services/BranchService';
import {useAuthOTP} from '../account/useAuthOTP';
import {useValidation, REGEX_PHONE} from '../validations/useFormValidation';
import {resolveMediaListForApi} from '../../utils/mediaUrl';
import {useManagerProfile} from '../../configuration/ManagerProfileContext';

const TOTAL_STEPS = 7;

export function useCreateBranch(navigation, route) {
    const businessId = route.params?.businessId;
    const {profile} = useManagerProfile();

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [phoneError, setPhoneError] = useState(null);

    const [branchName, setBranchName] = useState('');
    const [branchAddress, setBranchAddress] = useState('');
    const [selectedAmenities, setSelectedAmenities] = useState([]);
    const [selectedThemeIds, setSelectedThemeIds] = useState([]);
    const [bankName, setBankName] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [branchImages, setBranchImages] = useState([]);

    const {value: branchPhone, setValue: setBranchPhone, isValid: isValidPhone} = useValidation(
        '',
        REGEX_PHONE
    );
    const {handleSendBusinessOTP} = useAuthOTP();
    const [amenityOptions, setAmenityOptions] = useState([]);
    const [catalogThemes, setCatalogThemes] = useState([]);
    const [guestSegments, setGuestSegments] = useState(['Family', 'Business', 'Solo', 'Couple', 'Group']);
    const verificationEmail = useMemo(
        () => String(profile?.email || '').trim().toLowerCase(),
        [profile?.email]
    );

    useEffect(() => {
        if (!businessId) {
            Alert.alert('Error', 'Business ID is missing. Please select a business first.', [
                {text: 'OK', onPress: () => navigation.goBack()},
            ]);
        }
    }, [businessId, navigation]);

    useEffect(() => {
        (async () => {
            const [res, segRes, themeRes] = await Promise.all([
                fetchAmenityOptions(),
                fetchGuestSegments(),
                fetchCatalogThemes(),
            ]);
            if (res.status === 'success') setAmenityOptions(Array.isArray(res?.data) ? res.data : []);
            if (segRes.status === 'success' && Array.isArray(segRes.data) && segRes.data.length) {
                setGuestSegments(segRes.data);
            }
            if (themeRes.status === 'success') {
                const rows = Array.isArray(themeRes.data) ? themeRes.data : [];
                setCatalogThemes(rows);
                if (rows.length && selectedThemeIds.length === 0) {
                    setSelectedThemeIds(rows.slice(0, 2).map((row) => String(row?.id || '')).filter(Boolean));
                }
            }
        })();
    }, []);

    const toggleAmenity = (amenity) => {
        setSelectedAmenities((prev) =>
            prev.includes(amenity) ? prev.filter((item) => item !== amenity) : [...prev, amenity]
        );
    };

    const toggleTheme = (themeId) => {
        const id = String(themeId || '').trim();
        if (!id) return;
        setSelectedThemeIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleContinue = async () => {
        if (step < TOTAL_STEPS) {
            setStep(step + 1);
        } else {
            setIsLoading(true);
            setPhoneError(null);
            try {
                if (!verificationEmail) {
                    setPhoneError('Missing manager email. Please update your profile first.');
                    return;
                }
                await handleSendBusinessOTP(verificationEmail);
                setShowOtpModal(true);
            } catch (error) {
                setPhoneError(error.message || 'Failed to send verification code.');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleOtpSuccess = async () => {
        setShowOtpModal(false);
        Keyboard.dismiss();
        setIsLoading(true);

        try {
            const remoteImages = await resolveMediaListForApi(branchImages, 'nesto/branches');
            const newBranchPayload = {
                name: String(branchName || '').trim(),
                address: String(branchAddress || '').trim(),
                images: remoteImages,
                image: remoteImages[0] || null,
                amenities: selectedAmenities,
                guestSegments,
                themeIds: selectedThemeIds,
                billing: {bankName, accountNumber: bankAccount},
                contact: {phone: String(branchPhone || '').trim()},
            };

            const res = await createBranch(businessId, newBranchPayload);

            if (res.status === 'success') {
                Alert.alert('Success', 'Branch verified and created successfully!', [
                    {
                        text: 'OK',
                        onPress: () => {
                            navigation.goBack();
                        },
                    },
                ]);
            }
        } catch {
            Alert.alert('Error', 'Failed to save branch data.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
        else navigation.goBack();
    };

    const checkIsValid = () => {
        switch (step) {
            case 1:
                return branchName.trim().length > 0;
            case 2:
                return branchAddress.trim().length > 0;
            case 3:
                return selectedThemeIds.length > 0;
            case 4:
                return selectedAmenities.length > 0;
            case 5:
                return bankName.trim().length > 0 && bankAccount.trim().length > 5;
            case 6:
                return branchImages.length > 0 && !isLoading;
            case 7:
                return isValidPhone && !isLoading;
            default:
                return false;
        }
    };

    const getTitle = () => {
        switch (step) {
            case 1:
                return 'What is the name of this branch?';
            case 2:
                return 'Where is this branch located?';
            case 3:
                return 'Which stay types fit this branch?';
            case 4:
                return 'Select facilities available at this location';
            case 5:
                return 'Set up payout account for this branch';
            case 6:
                return 'Upload branch photos';
            case 7:
                return 'What is this branch hotline?';
            default:
                return '';
        }
    };

    return {
        step,
        totalSteps: TOTAL_STEPS,
        verificationEmail,
        branchName,
        setBranchName,
        branchAddress,
        setBranchAddress,
        branchImages,
        setBranchImages,
        selectedAmenities,
        amenityOptions,
        toggleAmenity,
        catalogThemes,
        selectedThemeIds,
        toggleTheme,
        bankName,
        setBankName,
        bankAccount,
        setBankAccount,
        branchPhone,
        setBranchPhone,
        isLoading,
        handleContinue,
        handleBack,
        checkIsValid,
        getTitle,
        showOtpModal,
        setShowOtpModal,
        handleOtpSuccess,
        phoneError,
        setPhoneError,
    };
}
