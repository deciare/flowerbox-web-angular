/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { AfterViewInit, Component } from "@angular/core";
import { Cookie } from "ng2-cookies";

import { Tag } from "../shared/tag";

@Component({
	moduleId: module.id,
	selector: "ace-config",
	templateUrl: "./ace-config.component.html"
})
export class AceConfigComponent {
	private domId: string;
	private editor: any; // Ace editor
	private element: JQuery;

	config: {
		behavioursEnabled: boolean,
		keyboardHandler: string,
		tabSize: number,
		useSoftTabs: boolean,
		wrapBehavioursEnabled: boolean
	};

	constructor() {
		this.config = {
			behavioursEnabled: false,
			keyboardHandler: "emacs",
			tabSize: 4,
			useSoftTabs: false,
			wrapBehavioursEnabled: false
		}
		this.domId = "ace-config-" + Tag.makeTag(3);
	}

	ngAfterViewInit() {
		this.element = $(`#${this.domId}`);
	}

	applyConfig() {
		for (let key in this.config) {
			switch(key) {
			case "behavioursEnabled":
				this.editor.setBehavioursEnabled(this.config[key]);
				break;
			case "keyboadHandler":
				this.editor.setKeyboardHandler("ace/keyboard/" + this.config[key]);
				break;
			case "tabSize":
				this.editor.getSession().setTabSize(this.config[key]);
				break;
			case "useSoftTabs":
				this.editor.getSession().setUseSoftTabs(this.config[key]);
				break;
			case "wrapBehavioursEnabled":
				this.editor.setWrapBehavioursEnabled(this.config[key]);
				break;
			}
		}
	}

	loadConfig() {
		var config = JSON.parse(Cookie.get("ace_config"));
		for (let key in config) {
			this.config[key] = config[key];
		}
		this.applyConfig();
	}

	saveConfig() {
		this.applyConfig();
		Cookie.set("ace_config", JSON.stringify(this.config));
	}

	setEditor(editor: any) {
		this.editor = editor;
	}

	onSubmit() {
		this.saveConfig();
		this.element.modal("hide");
	}

	open(editor: any) {
		this.setEditor(editor);
		this.loadConfig();
		this.element.modal();
	}
}