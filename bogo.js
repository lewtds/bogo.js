function BoGo () {
    var Trans = {
        APPENDING: 0,
        MARK: 1,
        TONE: 2
    };

    var Mark = {
        NONE: 0,
        HAT: 1,
        BREVE: 2,
        HORN: 3,
        DASH: 4
    };

    var Tone = {
        NONE: 0,
        GRAVE: 1,
        ACUTE: 2,
        HOOK: 3,
        TILDE: 4,
        DOT: 5
    };

    var VOWELS = "aàáảãạăằắẳẵặâầấẩẫậeèéẻẽẹêềếểễệiìíỉĩị" +
                 "oòóỏõọôồốổỗộơờớởỡợuùúủũụưừứửữựyỳýỷỹỵ";

    var composition = [];
    var rules       = [];

    var MARKS_MAP = {
        'a': "aâă__",
        'â': "aâă__",
        'ă': "aâă__",
        'e': "eê___",
        'ê': "eê___",
        'o': "oô_ơ_",
        'ô': "oô_ơ_",
        'ơ': "oô_ơ_",
        'u': "u__ư_",
        'ư': "u__ư_",
        'd': "d___đ",
        'đ': "d___đ"
    }

    var MARK_CHARS = {
        '^': Mark.HAT,
        '(': Mark.BREVE,
        '+': Mark.HORN,
        '-': Mark.DASH
    };

    var TONE_CHARS = {
        '~': Tone.TILDE,
        "'": Tone.ACUTE,
        '?': Tone.HOOK,
        '`': Tone.GRAVE,
        '.': Tone.DOT
    };

    function is_vowel(chr) {
        return VOWELS.indexOf(chr) != -1;
    }

    function add_mark_to_char(chr, mark) {
        var result = null;
        var tone = get_tone_from_char(chr);
        chr = add_tone_to_char(chr, Tone.NONE);

        if (chr in MARKS_MAP && MARKS_MAP[chr][mark] != '_') {
            result = MARKS_MAP[chr][mark];
        } else {
            result = chr;
        }

        result = add_tone_to_char(result, tone);
        return result;
    }

    function get_tone_from_char(chr) {
        var position = VOWELS.indexOf(chr);
        if (position != -1) {
            return position % 6;
        } else {
            return Tone.NONE;
        }
    }

    function add_tone_to_char(chr, tone) {
        var result = null;
        var position = VOWELS.indexOf(chr);

        if (position != -1) {
            var current_tone = position % 6;
            var offset = tone - current_tone;
            result = VOWELS[position + offset];
        } else {
            result = chr;
        }
        return result;
    }

    function find_mark_target(rule) {
        var target = null;
        for (var i = composition.length - 1; i > -1; i--) {
            if (composition[i].rule.key == rule.effective_on) {
                target = composition[i];
            }
        }
        return target;
    }

    function find_rightmost_vowels() {
        var vowels = [];
        for (var i = composition.length - 1; i > -1 ; i--) {
            var trans = composition[i];

            if (trans.rule.type == Trans.APPENDING &&
                is_vowel(trans.rule.key)) {
                vowels.unshift(trans);
            }
        }
        return vowels;
    }

    function find_next_appending_trans(trans) {
        var from_index = composition.indexOf(trans);
        var next_appending_trans = null;

        // FIXME: Need not-found guard.
        for (var i = from_index + 1; i < composition.length; i++) {
            if (composition[i].rule.type == Trans.APPENDING) {
                next_appending_trans = composition[i];
            }
        }

        return next_appending_trans;
    }

    function find_tone_target(rule) {
        var vowels = find_rightmost_vowels();
        var target = null;

        if (vowels.length == 1) {
            // cá
            target = vowels[0];
        } else if (vowels.length == 2) {
            if (find_next_appending_trans(vowels[1]) != null ||
                flatten(vowels) == 'uo') {
                // nước, thuở
                target = vowels[1];
            } else {
                // cáo
                target = vowels[0];
            }
        } else if (vowels.length == 3) {
            if (flatten(vowels) == 'uye') {
                // chuyển
                target = vowels[2];
            } else {
                // khuỷu
                target = vowels[1];
            }
        }

        return target;
    }

    function refresh_last_tone_target() {
        // Refresh the tone position of the last Trans.TONE transformation.
        for (var i = composition.length - 1; i >= 0; i--) {
            var trans = composition[i];
            if (trans.rule.type == Trans.TONE) {
                var new_target = find_tone_target(trans.rule);
                trans.target = new_target;
                break;
            }
        };
    }

    function process_char(chr) {
        var isUpperCase = chr === chr.toUpperCase();
        chr = chr.toLowerCase();

        var applicable_rules = [];
        rules.forEach(function (rule) {
            if (rule.key == chr) {
                applicable_rules.push(rule);
            }
        });

        // If none of the applicable_rules can actually be applied then this new
        // transformation fallbacks to an APPENDING one.
        var trans = {
            rule: {
                type: Trans.APPENDING,
                key: chr
            },
            isUpperCase: isUpperCase
        };

        for (var i = 0; i < applicable_rules.length; i++) {
            var rule = applicable_rules[i];
            if (rule.type == Trans.MARK) {
                var target = find_mark_target(rule);
            } else if (rule.type == Trans.TONE) {
                var target = find_tone_target(rule);
            }

            if (target != undefined) {
                // Fix uaw being wrongly processed to muă by skipping
                // the aw rule. Then the uw rule will be matched later.
                // Note that this requires the aw rule be placed before
                // uw in the rule list.
                if (chr == 'w') {
                    var target_index = composition.indexOf(target);
                    var prev_trans   = composition[target_index - 1];
                    if (target.rule.key     == 'a' &&
                        prev_trans.rule.key == 'u') {
                        continue;
                    }
                }

                trans.rule = rule;
                trans.target = target;
                break;
            }
        }

        composition.push(trans);

        // Implement the uow typing shortcut by creating a virtual
        // Mark.HORN rule that targets 'u'.
        //
        // FIXME: This is a potential slowdown. Perhaps it should be
        //        toggled by a config key.
        if (flatten().match(/uơ.+$/)) {
            var vowels = find_rightmost_vowels();
            var virtual_trans = {
                rule: {
                    type: Trans.MARK,
                    key: '', // This is a virtual rule,
                             // it should not appear in the raw string.
                    effect: Mark.HORN
                },
                target: vowels[0]
            };

            composition.push(virtual_trans);
        }

        // Sometimes, a tone's position in a previous state must be changed to
        // fit the new state.
        //
        // e.g.
        // prev state: chuyenr  -> chuỷen
        // this state: chuyenre -> chuyển
        if (trans.rule.type == Trans.APPENDING) {
            refresh_last_tone_target();
        }
    }

    function flatten() {
        var canvas = [];

        composition.forEach(function (trans, index) {

            function apply_effect(func, trans) {
                var index = trans.target.dest;
                var char_with_effect = func(canvas[index], trans.rule.effect);

                // Double typing an effect key undoes it. Btw, we're playing
                // fast-and-loose here by relying on the fact that Tone.NONE equals
                // Mark.None and equals 0.
                if (char_with_effect == canvas[index]) {
                    canvas[index] = func(canvas[index], Tone.NONE);
                } else {
                    canvas[index] = char_with_effect;
                }
            }

            switch (trans.rule.type) {
            case Trans.APPENDING:
                trans.dest = canvas.length;
                canvas.push(trans.rule.key);
                break;
            case Trans.MARK:
                apply_effect(add_mark_to_char, trans);
                break;
            case Trans.TONE:
                apply_effect(add_tone_to_char, trans);
                break;
            default:
                break;
            }
        });

        composition.forEach(function (trans) {
            if (trans.rule.type == Trans.APPENDING) {
                if (trans.isUpperCase) {
                    canvas[trans.dest] = canvas[trans.dest].toUpperCase();
                }
            }
        });

        return canvas.join('');
    }

    function process_string(string) {
        for (var i = 0; i < string.length; i++) {
            process_char(string[i]);
        };

        return flatten(composition);
    }

    // parse_rule('a a a^') -> {type: Trans.MARK, effect: HAT, key: a, effective_on: a}
    // parse_rule('a w a(') -> {type: Trans.MARK, effect: BREVE, key: w, effective_on: a}
    // parse_rule('a f a`') -> {type: Trans.MARK, effect: HAT, key: a, effective_on: a}
    // parse_rule('w u+') -> {type: Trans.APPEND, effect: ư, key: w}
    function parse_rule(string) {
        var tokens = string.trim().replace(/\s\s+/, ' ').split(' ');

        var effective_on = tokens[0];
        var key = tokens[1];

        var effect_char = tokens[2][1];
        if (effect_char in MARK_CHARS) {
            var type = Trans.MARK;
            var effect = MARK_CHARS[effect_char];
        } else if (effect_char in TONE_CHARS) {
            var type = Trans.TONE;
            var effect = TONE_CHARS[effect_char];
        }

        var trans = {
            type: type,
            key: key,
            effect: effect,
            effective_on: effective_on
        };

        return trans;
    }

    function process_backspace() {
        var indexes_to_remove = [];
        var last_appending_trans;

        // Find the last APPENDING transformation and all
        // the transformations that add effects to it.
        for (var i = composition.length - 1; i >= 0; i--) {
            var trans = composition[i];
            if (last_appending_trans === undefined) {
                if (trans.rule.type == Trans.APPENDING) {
                    last_appending_trans = trans;
                    indexes_to_remove.push(i);
                    break;
                }
            } else if (trans.hasOwnProperty('target' &&
                       trans.target === last_appending_trans)) {
                indexes_to_remove.push(i);
            }
        };

        // Then remove them
        indexes_to_remove.forEach(function (index) {
            composition.splice(i, 1);
        });
    }

    function get_raw_input_string() {
        var raw_input_keys = [];
        composition.forEach(function (trans) {
            raw_input_keys.push(trans.rule.key);
        });
        return raw_input_keys.join('');
    }

    function clear_composition() {
        composition = [];
    }

    function clear_rules() {
        rules = [];
    }
};

