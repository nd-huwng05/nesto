import {useState} from "react";
import {TextInput, TouchableOpacity, View} from "react-native";
import {QuestionLayout} from "../../../layout/QuestionLayout";
import {Check} from "lucide-react-native";

export default function CreateBusinessWizard({navigation}) {
    const [step, setStep] = useState(1)
    const [name, setName] = useState("");
    const [type, setType] = useState("");
    const [scale, setScale] = useState("");
    const [features, setFeatures] = useState([]);

    const handleContinue = () => {
        if (step < 4) {
            setStep(step + 1);
        } else {
            navigation.goBack();
        }
    };

    const checkIsValid = () => {
        switch (step) {
            case 1:
                return name.trim().length > 0;
            case 2:
                return type !== "";
            case 3:
                return scale !== "";
            case 4:
                return features.length > 0;
            default:
                return false;
        }
    }

    const toggleFeature = (feat) => {
        if (features.includes(feat)) {
            setFeatures(features.filter(f => f !== feat));
        } else {
            setFeatures([...features, feat]);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            navigation.goBack();
        }
    };

    const getTitle = () => {
        switch (step) {
            case 1: return "What is the name of your business?";
            case 2: return "What is your primary lodging model?";
            case 3: return "How many branches are you currently operating?";
            case 4: return "Which guest segments does your business serve the most?";
            default: return "";
        }
    };

    return (
        <QuestionLayout

            navigation={{ goBack: handleBack }}
            title={getTitle()}
            isValid={checkIsValid()}
            onContinue={handleContinue}
            footerText={<Text className="text-gray-400 mb-2 font-sf">Step {step} of 4</Text>}
        >
            {step === 1 && (
                <View className="mt-4">
                    <TextInput
                        placeholder="Enter business name (e.g. Swiss, Nesto...)"
                        placeholderTextColor="#94a3b8"
                        value={name}
                        onChangeText={setName}
                        className="w-full border-b border-gray-300 text-xl font-sf-medium py-3 text-slate-800 text-center focus:border-primary"
                    />
                </View>
            )}

            {step === 2 && (
                <View className="gap-3 mt-4">
                    {["Hotel", "Homestay", "Resort", "Villa"].map((item) => (
                        <TouchableOpacity
                            key={item}
                            activeOpacity={0.8}
                            onPress={() => setType(item)}
                            className={`p-4 rounded-2xl border flex-row justify-between items-center ${
                                type === item ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                            }`}
                        >
                            <Text className={`text-base font-sf-medium ${type === item ? "text-primary" : "text-slate-700"}`}>{item}</Text>
                            {type === item && <Check size={18} color="#4f46e5" />}
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {step === 3 && (
                <View className="gap-3 mt-4">
                    {["Single location", "2 - 5 branches", "More than 5 branches"].map((item) => (
                        <TouchableOpacity
                            key={item}
                            activeOpacity={0.8}
                            onPress={() => setScale(item)}
                            className={`p-4 rounded-2xl border flex-row justify-between items-center ${
                                scale === item ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
                            }`}
                        >
                            <Text className={`text-base font-sf-medium ${scale === item ? "text-primary" : "text-slate-700"}`}>{item}</Text>
                            {scale === item && <Check size={18} color="#4f46e5" />}
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {step === 4 && (
                <View className="flex-row flex-wrap gap-2.5 mt-4 justify-center">
                    {["Family", "Couple", "Beachfront", "Business Travelers", "Dorm"].map((feat) => {
                        const isSelected = features.includes(feat);
                        return (
                            <TouchableOpacity
                                key={feat}
                                activeOpacity={0.8}
                                onPress={() => toggleFeature(feat)}
                                className={`px-5 py-3 rounded-full border ${
                                    isSelected ? "border-primary bg-primary" : "border-gray-300 bg-white"
                                }`}
                            >
                                <Text className={`text-sm font-sf-medium ${isSelected ? "text-white" : "text-slate-600"}`}>{feat}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </QuestionLayout>
    );
}