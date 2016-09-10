/*
	flowerbox-web-angular
	Copyright (C) 2016 Deciare
	For licensing info, please see LICENCE file.
*/
import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs/Subscription";

import { EventStream, EventStreamItem } from "../models/event-stream";
import { WobInfoModel, WobInfoModelList } from "../models/wob";

import { RichChunk, RichChunkComponent } from "../embed/rich-chunk.component";

import { StatusService } from "./status.service";

@Component({
	moduleId: module.id,
	selector: "infobar",
	styleUrls: [
		"./infobar.component.css"
	],
	templateUrl: "./infobar.component.html"
})
export class InfobarComponent implements OnDestroy, OnInit {
	private locationSubscription: Subscription;
	private locationContentsSubscription: Subscription;
	private locationPlayersSubscription: Subscription;
	private playerSubscription: Subscription;

	location: WobInfoModel;
	locationChunk: any;
	locationContents: WobInfoModelList;
	locationPlayers: WobInfoModelList;
	player: WobInfoModel;
	playerChunk: any;

	constructor(
		private statusService: StatusService
	) {
		// Dependency injetion only; no code
	}

	ngOnInit() {
		this.locationSubscription = this.statusService.location.subscribe((location) => {
			this.location = location;
		});

		this.locationContentsSubscription = this.statusService.locationContents.subscribe((contents) => {
			this.locationContents = contents;
		});

		this.locationPlayersSubscription = this.statusService.locationPlayers.subscribe((players) => {
			this.locationPlayers = players;
		});

		this.playerSubscription = this.statusService.player.subscribe((player) => {
			this.player = player;
		});
	}

	ngOnDestroy() {
		this.locationSubscription.unsubscribe();
		this.locationContentsSubscription.unsubscribe();
		this.locationPlayersSubscription.unsubscribe();
		this.playerSubscription.unsubscribe();
	}
}