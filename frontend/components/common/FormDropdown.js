import {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Check, ChevronDown} from 'lucide-react-native';

/**
 * Inline dropdown — menu opens directly below the trigger (no bottom sheet).
 * @param {object} props
 * @param {boolean} [props.isOpen] Controlled open state
 * @param {(open: boolean) => void} [props.onOpenChange] Controlled open callback
 * @param {number} [props.menuZIndex] z-index when stacking multiple dropdowns
 */
export function FormDropdown({
    label,
    value,
    options,
    onSelect,
    placeholder = 'Select…',
    disabled = false,
    error,
    compact = false,
    isOpen: controlledOpen,
    onOpenChange,
    menuZIndex = 50,
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;

    const setOpen = (next) => {
        if (isControlled) {
            onOpenChange?.(next);
        } else {
            setInternalOpen(next);
        }
    };

    useEffect(() => {
        if (disabled && open) setOpen(false);
    }, [disabled, open]);

    const selected = options.find((o) => o.value === value);

    const handleSelect = (next) => {
        onSelect(next);
        setOpen(false);
    };

    const toggle = () => {
        if (disabled) return;
        setOpen(!open);
    };

    return (
        <View
            style={[
                styles.wrap,
                compact && styles.wrapCompact,
                {zIndex: open ? menuZIndex : 1},
            ]}
        >
            {label ? <Text className="font-sf text-xs text-gray-500 mb-1.5">{label}</Text> : null}

            <View style={styles.anchor}>
                <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={disabled}
                    onPress={toggle}
                    style={[
                        styles.trigger,
                        disabled && styles.triggerDisabled,
                        error ? styles.triggerError : null,
                        open && styles.triggerOpen,
                    ]}
                >
                    <Text
                        className={`font-sf text-base flex-1 ${
                            selected ? 'text-slate-800' : 'text-gray-400'
                        }`}
                        numberOfLines={1}
                    >
                        {selected?.label || placeholder}
                    </Text>
                    <ChevronDown
                        size={20}
                        color={disabled ? '#d1d5db' : '#64748b'}
                        style={open ? styles.chevronOpen : undefined}
                    />
                </TouchableOpacity>

                {open ? (
                    <View style={[styles.menu, {zIndex: menuZIndex}]}>
                        <ScrollView
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                            style={styles.menuScroll}
                            bounces={false}
                        >
                            {options.map((item) => {
                                const active = item.value === value;
                                return (
                                    <TouchableOpacity
                                        key={item.value}
                                        style={[styles.option, active && styles.optionActive]}
                                        onPress={() => handleSelect(item.value)}
                                        activeOpacity={0.7}
                                    >
                                        <Text
                                            className={`font-sf text-base flex-1 ${
                                                active ? 'text-primary font-semibold' : 'text-slate-700'
                                            }`}
                                            numberOfLines={2}
                                        >
                                            {item.label}
                                        </Text>
                                        {active ? <Check size={18} color="#8294FF" /> : null}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                ) : null}
            </View>

            {error ? <Text className="font-sf text-xs text-red-500 mt-1">{error}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        marginBottom: 16,
        position: 'relative',
    },
    wrapCompact: {
        marginBottom: 12,
    },
    anchor: {
        position: 'relative',
    },
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 16,
        minHeight: 48,
    },
    triggerOpen: {
        borderColor: '#8294FF',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    triggerDisabled: {
        opacity: 0.55,
        backgroundColor: '#f3f4f6',
    },
    triggerError: {
        borderColor: '#f87171',
    },
    chevronOpen: {
        transform: [{rotate: '180deg'}],
    },
    menu: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: '#8294FF',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 12,
        overflow: 'hidden',
    },
    menuScroll: {
        maxHeight: 220,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#f1f5f9',
    },
    optionActive: {
        backgroundColor: '#f8fafc',
    },
});
