/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";

import { EditorModule } from "./editor/editor.module";
import { StatusModule } from "./status/status.module";
import { TerminalModule } from "./terminal/terminal.module";

import { AppComponent } from "./app.component";
import { appRouting } from "./app.routing";

import { MainTerminalComponent } from "./main-terminal.component";

@NgModule({
	imports: [
		BrowserModule,
		EditorModule,
		StatusModule,
		TerminalModule,
		appRouting
	],
	declarations: [
		AppComponent,
		MainTerminalComponent
	],
	bootstrap: [
		AppComponent
	]
})
export class AppModule {
}
