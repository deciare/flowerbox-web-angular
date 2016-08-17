/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, ViewEncapsulation } from "@angular/core";

@Component({
	moduleId: module.id,
	encapsulation: ViewEncapsulation.None,
	selector: "main-terminal",
	styles: [`
		terminal > .terminal {
			padding-top: 1.4em;
		}
	`],
	template: `
		<infobar></infobar>
		<terminal></terminal>
	`
})
export class MainTerminalComponent {
}