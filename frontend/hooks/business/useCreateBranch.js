import {useState, useEffect} from 'react';
import {Alert, Keyboard} from 'react-native';
import {createBranch, MANAGER_ID} from '../../services/BranchService';
import {useAuthOTP} from '../account/useAuthOTP';
import {useValidation, REGEX_PHONE} from '../validations/useFormValidation';

const TOTAL_STEPS = 6;

export function useCreateBranch(navigation, route) {
    const businessId = route.params?.businessId;

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
    const {handleSendOTP} = useAuthOTP();

    const amenityOptions = [
        'Free Wifi',
        'Swimming Pool',
        'Gym / Fitness',
        'Parking Space',
        '24/7 Front Desk',
        'Restaurant',
    ];

    useEffect(() => {
        if (!businessId) {
            Alert.alert('Error', 'Business ID is missing. Please select a business first.', [
                {text: 'OK', onPress: () => navigation.goBack()},
            ]);
        }
    }, [businessId, navigation]);

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
                await handleSendOTP(branchPhone);
                setShowOtpModal(true);
            } catch (error) {
                setPhoneError(error.response?.message || 'Failed to send OTP to branch hotline.');
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
            const newBranchPayload = {
                id: 'br_' + Date.now(),
                managerId: MANAGER_ID,
                name: branchName,
                address: branchAddress,
                images: branchImages,
                image: branchImages[0],
                amenities: selectedAmenities,
                guestSegments: ['Family'],
                billing: {bankName, accountNumber: bankAccount},
                phone: branchPhone,
            };

            const res = await createBranch(businessId, newBranchPayload, MANAGER_ID);

            if (res.status === 'success') {
                Alert.alert('Success', 'Branch verified and created successfully!', [
                    {
                        text: 'OK',
                        onPress: () => {
                            route?.params?.onBranchCreated?.(businessId, res.data);
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
