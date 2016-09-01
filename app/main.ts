/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { AppModule } from "./app.module";

const platform = platformBrowserDynamic();
platform.bootstrapModule(AppModule);
