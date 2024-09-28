import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    delimiters: {
        type: OptionType.STRING,
        default: "?!.",
        description: "Delimiters after which the next letter is capitalized.",
        restartNeeded: false
    },
    eachLine: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Capitalize the first letter of each new line.",
        restartNeeded: false
    },
    firstLetter: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Capitalize the first letter of the message.",
        restartNeeded: false
    },
    dotAtEnd: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Add a period at the end of the message.",
        restartNeeded: false
    },
    dotAtEachLine: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Add a period at the end of each line.",
        restartNeeded: false
    },
    excludeEndSymbols: {
        type: OptionType.STRING,
        default: "!?.,:()",
        description: "Symbols after which a period should not be added at the end.",
        restartNeeded: false
    }
});

function capitalizeFirstLetterOfString(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function addDotIfMissing(str: string): string {
    const endChar = str.trimEnd().slice(-1);
    const excludedSymbols = settings.store.excludeEndSymbols.split('');
    return !excludedSymbols.includes(endChar) ? str.trimEnd() + '.' : str;
}

function extractUrls(content: string): { content: string, urls: string[] } {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls: string[] = [];
    content = content.replace(urlRegex, (url) => {
        urls.push(url);
        return `__URL${urls.length - 1}__`;
    });
    return { content, urls };
}

function restoreUrls(content: string, urls: string[]): string {
    urls.forEach((url, index) => {
        content = content.replace(`__URL${index}__`, url);
    });
    return content;
}

function capitalizeLines(content: string): string {
    return content
        .split("\n")
        .map((line, i) => i === 0 ? line : capitalizeFirstLetterOfString(line))
        .join("\n");
}

function addDotsToLines(content: string): string {
    return content
        .split("\n")
        .map((line, i, arr) => i === arr.length - 1 ? line : addDotIfMissing(line))
        .join("\n");
}

function applyDelimiters(content: string): string {
    const regexp = new RegExp(`[${settings.store.delimiters}]\\s*`, "g");
    content.replaceAll(regexp, (substring: string, index: number) => {
        const letterToCapitalizeIndex = index + substring.length;
        content = content.slice(0, letterToCapitalizeIndex) + content.charAt(letterToCapitalizeIndex).toUpperCase() + content.slice(letterToCapitalizeIndex + 1);
        return substring;
    });
    return content;
}

function processContent(content: string): string {
    if (settings.store.firstLetter) content = capitalizeFirstLetterOfString(content);
    if (settings.store.dotAtEnd) content = addDotIfMissing(content);
    if (settings.store.eachLine) content = capitalizeLines(content);
    if (settings.store.dotAtEachLine) content = addDotsToLines(content);
    return applyDelimiters(content);
}

function applyRules(content: string): string {
    if (content.length === 0) return content;

    const { content: processedContent, urls } = extractUrls(content);
    content = processContent(processedContent);
    return restoreUrls(content, urls);
}

export default definePlugin({
    name: "SmartCapitalization",
    description: "SmartCapitalization is a customizable Vencord plugin that writes with a capital letter at the beginning of each sentence, automatically adds periods at the end of messages and lines, with user-defined exclusions.",
    authors: [{ name: "dimabreus", id: 840559505308909599n }],
    dependencies: ["MessageEventsAPI"],

    settings,

    async start() {
        this.preSend = addPreSendListener((_, msg) => {
            msg.content = applyRules(msg.content);
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
