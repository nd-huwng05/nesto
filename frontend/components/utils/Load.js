import {ActivityIndicator, View} from "react-native";
import React from "react";

export function LoadScreen() {
    return (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#white'}}>
            <ActivityIndicator size="large" color="#8294FF"/>
        </View>
    );
}