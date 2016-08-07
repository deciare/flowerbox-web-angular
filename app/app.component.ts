/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component } from "@angular/core";
import { TerminalComponent } from "./terminal.component";

@Component({
	moduleId: module.id,
	selector: "my-app",
	templateUrl: "./app.component.html",
	directives: [
		TerminalComponent
	]
})
export class AppComponent {
}
