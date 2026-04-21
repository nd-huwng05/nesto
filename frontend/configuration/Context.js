import React, {createContext, useEffect, useState} from 'react';
import {useFonts} from 'expo-font';
import {LoadScreen} from "../components/utils/Load";
import {Asset} from "expo-asset";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const GlobalContext = createContext()

export default function Context({children}) {
    const [isAppReady, setIsAppReady] = useState(false);
    const [initialRoute, setInitialRoute] = useState(null);

    const [fontsLoaded] = useFonts({
        'WendyOne': require('../assets/fonts/WendyOne-Regular.ttf'),
        'SF-Regular': require('../assets/fonts/SF-Pro-Display-Regular.otf'),
        'SF-Bold': require('../assets/fonts/SF-Pro-Display-Bold.otf'),
        'SF-Semibold': require('../assets/fonts/SF-Pro-Display-Semibold.otf'),
    });

    useEffect(() => {
        async function prepareApp() {
            try {
                 const images = [
                    require('../assets/images/icon.svg'),
                    require('../assets/images/onboarding/nesto_01.jpg'),
                    require('../assets/images/onboarding/nesto_02.jpg'),
                    require('../assets/images/onboarding/nesto_03.jpg'),
                    require('../assets/images/onboarding/nesto_04.jpg'),
                    require('../assets/images/onboarding/nesto_05.jpg'),
                    require('../assets/images/onboarding/nesto_06.jpg'),
                    require('../assets/images/onboarding/nesto_07.jpg'),
                    require('../assets/images/decorator/decorate_01.png'),
                ]

                const cacheImages = images.map(image => Asset.fromModule(image).downloadAsync())
                const [hasSeen, userToken, ...rest] = await Promise.all([
                    AsyncStorage.getItem('hasWellcome'),
                    AsyncStorage.getItem('userToken'),
                    ...cacheImages
                ]);

                 if (hasSeen === null) {
                    setInitialRoute("OnboardingScreen");
                } else if (userToken !== null) {
                    setInitialRoute("HomeScreen");
                } else {
                    setInitialRoute("AccountScreen");
                }
            } catch (error) {
                console.error("Error read AsyncStore: ", error)
                setInitialRoute("OnboardingScreen");
            } finally {
                setIsAppReady(true);
            }
        }
        prepareApp()
    }, []);

    if (!fontsLoaded || !isAppReady) return (<LoadScreen/>);
    return (
        <GlobalContext.Provider value={{ initialRoute }}>
            {children}
        </GlobalContext.Provider>
    );
}