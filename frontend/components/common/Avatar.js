import {Image, Text, View} from 'react-native';

export default function Avatar({uri, user, name, size = 50}) {
  const safeUri = String(uri || user?.avatar || '').trim();
  const displayName = String(user?.name || name || '').trim();
  const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  if (safeUri) {
    return <Image source={{uri: safeUri}} style={{width: size, height: size, borderRadius: size / 2}} />;
  }

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#CCCCCC', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: Math.round(size * 0.4), fontWeight: 'bold', color: '#FFFFFF' }}>
        {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
      </Text>
    </View>
  );
}

