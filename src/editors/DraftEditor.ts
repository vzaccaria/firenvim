import { executeInPage } from "../utils/utils";
import { computeSelector } from "../utils/CSSUtils";
import { AbstractEditor } from "./AbstractEditor";

export class DraftEditor extends AbstractEditor {

    static matches (e: HTMLElement) {
        let parent = e;
        for (let i = 0; i < 3; ++i) {
            if (parent !== undefined && parent !== null) {
                if ((/DraftEditor/g).test(parent.className)) {
                    return true;
                }
                parent = parent.parentElement;
            }
        }
        return false;
    }

    private elem: HTMLElement;
    constructor (e: HTMLElement) {
        super();
        this.elem = e;
    }

    getContent () {
        return executeInPage(`(${(selec: string) => {
            let elem = document.querySelector(selec) as any;
            let editorState : any = undefined;
            do {
                const prop = Object.keys(elem).find(k => k.startsWith("__reactInternalInstance"));
                if (elem[prop] === undefined) {
                    return elem.innerText;
                }
                // TODO: replace with optional chaining once the build system supports it
                editorState = Object
                    .values(((elem[prop] || {}).child || {}).pendingProps || {})
                    .find((state: any) => (typeof (state || {}).getCurrentContent) === "function");
                elem = elem.parentElement;
            } while (editorState === undefined);
            return editorState.getCurrentContent().getPlainText();
        }})(${JSON.stringify(computeSelector(this.elem))})`);
    }

    getCursor () {
        return Promise.resolve([1, 0] as [number, number]);
    }

    getElement () {
        return this.elem;
    }

    getLanguage () {
        return Promise.resolve(undefined);
    }

    setContent (text: string) {
        return executeInPage(`(${(selec: string, txt: string) => {
            let elem = document.querySelector(selec) as any;
            const internalInstance = Object.keys(elem).find(k => k.startsWith("__reactInternalInstance"));
            // First, try to find the previous text:
            let prevText: string = undefined;
            let editorState : any;
            let currentContent : any;
            do {
                editorState = ((((elem[internalInstance] || {})
                    .child             || {})
                    .pendingProps      || {})
                    .editorState       || {});
                currentContent = ((editorState
                    .getCurrentContent || (()=>({}))).bind(editorState)());
                prevText = (currentContent
                    .getPlainText      || (()=>{})).bind(currentContent)();
                if (prevText === undefined) {
                    elem = elem.parentElement;
                }
            } while (prevText === undefined);
            console.log(prevText);
            function recurseChange(list: any[], i: number): undefined {
                if (i >= list.length)
                    return;
                let o = list[i];
                if (o === undefined || o === null) {
                    return recurseChange(list, i+1);
                }
                Object.values(o).forEach(v => {
                    if (!list.includes(v)) {
                        list.push(v);
                    }
                })
                if (o.setState !== undefined) {
                    try {
                        let edState = o.props.editorState;
                        if (edState === undefined) {
                            edState = o.state.editorState;
                        }
                        o.setState.bind(o)({ editorState: edState.constructor.createWithContent(edState.getCurrentContent().constructor.createFromText(txt))});
                    } catch (e) {}
                }

                if (o.onChange !== undefined) {
                    try {
                        o.onChange(o.editorState.constructor.createWithContent(o.editorState.getCurrentContent().constructor.createFromText(txt)));
                    } catch (e) { }
                }
                return recurseChange(list, i+1);
            }
            try {
                recurseChange([elem], 0);
                console.log("end of iteration");
            } catch (e) {
                console.log(e);
            }
        }})(${JSON.stringify(computeSelector(this.elem))}, ${JSON.stringify(text)})`);
    }

    setCursor (line: number, column: number) {
        return Promise.resolve();
    }
}
