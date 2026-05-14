import {createNativeStackNavigator} from "@react-navigation/native-stack";

const QuestionsStack = createNativeStackNavigator()
export default function QuestionFlow() {
    return (
        <QuestionsStack.Navigator screenOptions={{headerShown: false}}>

        </QuestionsStack.Navigator>
    )
}