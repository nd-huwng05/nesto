import {useMemo, useState, useEffect} from 'react';
import {Alert, Keyboard} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {createBusiness, fetchLodgingTypes} from '../../services/BranchService';
import {useAuthOTP} from '../account/useAuthOTP';
import {useValidation, REGEX_EMAIL, REGEX_PHONE} from '../validations/useFormValidation';
import {getImagePickerMediaTypes, resolveMediaForApi} from '../../utils/mediaUrl';

export function useCreateBusiness(navigation, route) {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [contactError, setContactError] = useState(null);

    const [name, setName] = useState('');
    const [logo, setLogo] = useState(null);
    const [type, setType] = useState('');
    const [scale, setScale] = useState('');

    const {value: corporateEmail, setValue: setCorporateEmail, isValid: isValidEmail} = useValidation(
        '',
        REGEX_EMAIL
    );
    const {value: contactPhone, setValue: setContactPhone, isValid: isValidPhone} = useValidation(
        '',
        REGEX_PHONE
    );
    const {handleSendBusinessOTP} = useAuthOTP();
    const normalizedEmail = useMemo(() => String(corporateEmail || '').trim().toLowerCase(), [corporateEmail]);
    const normalizedPhone = useMemo(
        () => String(contactPhone || '').replace(/[^\d+]/g, '').trim(),
        [contactPhone]
    );
    const [lodgingTypes, setLodgingTypes] = useState([]);

    useEffect(() => {
        const loadMetadata = async () => {
            try {
                const typesRes = await fetchLodgingTypes();
                if (typesRes.status === 'success') setLodgingTypes(typesRes.data);
            } catch (error) {
                console.error('Failed to load lodging types', error);
            }
        };
        loadMetadata();
    }, []);

    const pickLogo = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
                Alert.alert(
                    'Permission Denied',
                    'You need to allow photo library access to upload your business brand logo!'
                );
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: getImagePickerMediaTypes(ImagePicker),
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });
            if (!result.canceled && result.assets?.length > 0) {
                setLogo(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking brand logo: ', error);
            Alert.alert('Error', 'Something went wrong while opening your photo gallery.');
        }
    };

    const handleContinue = async () => {
        if (step < 5) {
            setStep(step + 1);
        } else {
            setIsLoading(true);
            setContactError(null);
            try {
                await handleSendBusinessOTP(normalizedEmail);
                setShowOtpModal(true);
            } catch (error) {
                const errorMsg = error.message || 'Failed to send OTP. Please try again.';
                setContactError(errorMsg);
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
            const remoteLogo = await resolveMediaForApi(logo, 'nesto/business');
            const newBusinessPayload = {
                name: String(name || '').trim(),
                lodgingType: type,
                businessType: type,
                scale,
                contact: {
                    email: normalizedEmail,
                    phone: normalizedPhone,
                },
            };
            if (remoteLogo) {
                newBusinessPayload.logo = remoteLogo;
            }

            const res = await createBusiness(newBusinessPayload);

            if (res.status === 'success') {
                Alert.alert('Success', 'Business created successfully!', [
                    {
                        text: 'OK',
                        onPress: () => {
                            navigation.goBack();
                        },
                    },
                ]);
                return;
            }
            const apiMessage =
                res.message ||
                (typeof res.data === 'object' ? JSON.stringify(res.data) : '') ||
                'Failed to save business data.';
            Alert.alert('Error', apiMessage);
        } catch (error) {
            console.error('API Error: ', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to save business data. Please try again.');
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
                return name.trim().length > 0;
            case 2:
                return logo !== null;
            case 3:
                return type !== '';
            case 4:
                return scale !== '';
            case 5:
                return isValidEmail && isValidPhone && !isLoading;
            default:
                return false;
        }
    };

    const getTitle = () => {
        switch (step) {
            case 1:
                return 'What is the name of your business?';
            case 2:
                return 'Upload a brand logo for your business';
            case 3:
                return 'What is your primary lodging model?';
            case 4:
                return 'How many branches are you currently operating?';
            case 5:
                return 'What are your corporate contact details?';
            default:
                return '';
        }
    };

    return {
        step,
        name,
        setName,
        logo,
        type,
        setType,
        scale,
        setScale,
        corporateEmail,
        setCorporateEmail,
        contactPhone,
        setContactPhone,
        lodgingTypes,
        isLoading,
        handleContinue,
        handleBack,
        checkIsValid,
        getTitle,
        pickLogo,
        showOtpModal,
        setShowOtpModal,
        handleOtpSuccess,
        contactError,
        setContactError,
    };
}
