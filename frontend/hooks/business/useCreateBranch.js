import {useMemo, useState, useEffect} from 'react';
import {Alert, Keyboard} from 'react-native';
import {createBranch, fetchAmenityOptions, fetchGuestSegments} from '../../services/BranchService';
import {useAuthOTP} from '../account/useAuthOTP';
import {useValidation, REGEX_PHONE} from '../validations/useFormValidation';
import {resolveApiPayloadLogo} from '../../utils/mediaUrl';
import {useManagerProfile} from '../../configuration/ManagerProfileContext';

const TOTAL_STEPS = 6;

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
    const [bankName, setBankName] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [branchImages, setBranchImages] = useState([]);

    const {value: branchPhone, setValue: setBranchPhone, isValid: isValidPhone} = useValidation(
        '',
        REGEX_PHONE
    );
    const {handleSendBusinessOTP} = useAuthOTP();
    const [amenityOptions, setAmenityOptions] = useState([]);
    const guestSegments = useMemo(() => ['Family', 'Business', 'Solo', 'Couple', 'Group'], []);
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
            const res = await fetchAmenityOptions();
            if (res.status === 'success') setAmenityOptions(Array.isArray(res?.data) ? res.data : []);
        })();
    }, []);

    const toggleAmenity = (amenity) => {
        setSelectedAmenities((prev) =>
            prev.includes(amenity) ? prev.filter((item) => item !== amenity) : [...prev, amenity]
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
            const remoteImages = (branchImages || []).map(resolveApiPayloadLogo).filter(Boolean);
            const newBranchPayload = {
                name: String(branchName || '').trim(),
                address: String(branchAddress || '').trim(),
                images: remoteImages,
                image: remoteImages[0] || null,
                amenities: selectedAmenities,
                guestSegments,
                billing: {bankName, accountNumber: bankAccount},
                phone: branchPhone,
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
                return selectedAmenities.length > 0;
            case 4:
                return bankName.trim().length > 0 && bankAccount.trim().length > 5;
            case 5:
                return branchImages.length > 0 && !isLoading;
            case 6:
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
                return 'Select facilities available at this location';
            case 4:
                return 'Set up payout account for this branch';
            case 5:
                return 'Upload branch photos';
            case 6:
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
