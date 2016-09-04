/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { AfterViewInit, Component, EventEmitter, Output } from "@angular/core";

import { Tag } from "../shared/tag";

export class NewPropertyParams {
	name: string;
	type: string;

	constructor(name: string, type: string) {
		this.name = name;
		this.type = type;
	}
}

@Component({
	moduleId: module.id,
	selector: "new-property",
	templateUrl: "./new-property.component.html"
})
export class NewPropertyComponent implements AfterViewInit {
	private domId: string;
	private element: JQuery;
	private validTypes: any;

	name: string;
	type: string;

	@Output()
	confirm: EventEmitter<NewPropertyParams>;

	constructor() {
		this.domId = "new-property-" + Tag.makeTag(3);
		this.validTypes = {
			Text: null,
			Image: "image"
		};
		this.confirm = new EventEmitter<NewPropertyParams>();
	}

	ngAfterViewInit() {
		this.element = $(`#${this.domId}`);
		this.element.on("shown.bs.modal", (event: JQueryEventObject) => {
			$("#propertyName").focus();
		});
	}

	onSubmit() {
		this.confirm.emit(new NewPropertyParams(this.name, this.validTypes[this.type]));
		this.element.modal("hide");
	}

	open() {
		this.name = "";
		this.type = "Text";
		this.element.modal();
	}
}