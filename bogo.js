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
    if (chr in MARKS_MAP && MARKS_MAP[chr][mark] != '_') {
        result = MARKS_MAP[chr][mark];
    } else {
        result = chr;
    }
    return result;
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

function find_mark_target(composition, rule) {
    for (var i = composition.length - 1; i > -1; i--) {
        if (composition[i].rule.key == rule.effective_on) {
            return composition[i];
        }
    }
}

function find_rightmost_vowel_indexes(composition) {
    var vowel_indexes = [];
    for (var i = composition.length - 1; i > -1 ; i--) {
        var trans = composition[i];

        if (trans.rule.type == Trans.APPENDING &&
            is_vowel(trans.rule.key)) {
            vowel_indexes.unshift(i);
        }
    }
    return vowel_indexes;
}

function find_next_appending_trans(composition, from_index) {
    for (var i = from_index + 1; i < composition.length; i++) {
        if (composition[i].rule.type == Trans.APPENDING) {
            return i;
        }
    }
    return -1;
}

function find_tone_target(composition, rule) {
    var vowel_indexes = find_rightmost_vowel_indexes(composition);

    if (vowel_indexes.length == 1) {
        var target_index = vowel_indexes[0];
    } else if (vowel_indexes.length == 2) {
        if (find_next_appending_trans(composition, vowel_indexes[1]) != -1) {
            var target_index = vowel_indexes[1];
        } else {
            var target_index = vowel_indexes[0];
        }
    } else if (vowel_indexes.length == 3) {
        var target_index = vowel_indexes[1];
    }

    return composition[target_index];
}

function refresh_last_tone_target(composition) {
    // Refresh the tone position of the last Trans.TONE transformation.
    for (var i = composition.length - 1; i >= 0; i--) {
        var trans = composition[i];
        if (trans.rule.type == Trans.TONE) {
            var new_target = find_tone_target(composition, trans.rule);
            trans.target = new_target;
            break;
        }
    };
}

function process_char(composition, chr, rules) {
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
            var target = find_mark_target(composition, rule);

        } else if (rule.type == Trans.TONE) {
            var target = find_tone_target(composition, rule);
        }

        if (target != undefined) {
            trans.rule = rule;
            trans.target = target;
            break;
        }
    }

    composition.push(trans);

    // Sometimes, a tone's position in a previous state must be changed to
    // fit the new state.
    //
    // e.g.
    // prev state: chuyenr  -> chuỷen
    // this state: chuyenre -> chuyển
    if (trans.rule.type == Trans.APPENDING) {
        refresh_last_tone_target(composition);
    }
}

function flatten(composition) {
    var canvas = [];

    composition.forEach(function (trans, index) {
        switch (trans.rule.type) {
        case Trans.APPENDING:
            trans.dest = canvas.length;
            canvas.push(trans.rule.key);
            break;
        case Trans.MARK:
            var index = trans.target.dest;
            canvas[index] = add_mark_to_char(canvas[index], trans.rule.effect);
            break;
        case Trans.TONE:
            var index = trans.target.dest;
            canvas[index] = add_tone_to_char(canvas[index], trans.rule.effect);
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

function process_string(string, rules) {
    var composition = [];

    for (var i = 0; i < string.length; i++) {
        process_char(composition, string[i], rules);
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

(function main() {


})();
