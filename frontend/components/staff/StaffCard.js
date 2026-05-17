import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {ChevronRight, Mail, Phone, UserCircle} from 'lucide-react-native';
import {UI, cardStyle} from '../../styles/uiTokens';

const roleColors = {
    Manager: {bg: '#eef2ff', text: '#4f46e5'},
    Receptionist: {bg: '#ecfdf5', text: '#059669'},
    Housekeeping: {bg: '#fff7ed', text: '#ea580c'},
};

export function StaffCard({staff, branchLabel, onPress, showBranchLabel = false}) {
    const roleStyle = roleColors[staff.role] || {bg: '#f3f4f6', text: '#64748b'};

    return (
        <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[cardStyle, styles.card]}>
            <View style={styles.row}>
                <View style={styles.avatar}>
                    <UserCircle size={28} color="#8294FF" />
                </View>

                <View style={styles.body}>
                    <Text className="font-sf-bold text-base text-slate-800" numberOfLines={1}>
                        {staff.name}
                    </Text>

                    {showBranchLabel && branchLabel ? (
                        <Text className="font-sf text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                            {branchLabel}
                        </Text>
                    ) : null}

                    <View style={styles.metaRow}>
                        <Mail size={12} color="#9ca3af" />
                        <Text className="font-sf text-xs text-gray-500 ml-1 flex-1" numberOfLines={1}>
                            {staff.email}
                        </Text>
                    </View>
                    {staff.phone ? (
                        <View style={styles.metaRow}>
                            <Phone size={12} color="#9ca3af" />
                            <Text className="font-sf text-xs text-gray-500 ml-1" numberOfLines={1}>
                                {staff.phone}
                            </Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.trailing}>
                    <View style={[styles.roleBadge, {backgroundColor: roleStyle.bg}]}>
                        <Text style={[styles.roleText, {color: roleStyle.text}]} numberOfLines={1}>
                            {staff.role}
                        </Text>
                    </View>
                    <ChevronRight size={22} color="#cbd5e1" />
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: UI.sectionGap,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    body: {
        flex: 1,
        minWidth: 0,
        paddingRight: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    trailing: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexShrink: 0,
        gap: 6,
        marginLeft: 4,
    },
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 24,
        maxWidth: 110,
    },
    roleText: {
        fontSize: 11,
        fontWeight: '600',
    },
});
