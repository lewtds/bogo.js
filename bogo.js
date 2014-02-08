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

VOWELS = "aàáảãạăằắẳẵặâầấẩẫậeèéẻẽẹêềếểễệiìíỉĩị" +
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

(function main() {


})();
