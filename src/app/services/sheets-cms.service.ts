import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface HomeContent {
  hero_video_url: string;
}
export interface CancionItem {
  titulo: string;
  url_youtube: string;
  orden: string;
  activo: string;
}

export interface EventItem {
  title: string;
  city: string;
  venue: string;
  date: string;
  ticket_url: string;
  tag: string;
  badge: string;
  desc: string;
  image_url?: string;
}
export interface SeccionCms {
  slug: string;
  titulo: string;
  sheet: string;
  tipo: 'links' | string;
  activo: string;
  orden: string;
}

export interface LinkItem {
  nombre: string;
  url: string;
  image_url?: string;
}

@Injectable({ providedIn: 'root' })
export class SheetsCmsService {
  private SHEET_ID = '13ZHryhmXylSWYSvbS5ISHGtUnw92_87xexUEAsc8HBk';

  constructor(private http: HttpClient) {}

  getHome(): Observable<HomeContent> {
    const url = `https://opensheet.elk.sh/${this.SHEET_ID}/home`;
    return this.http.get<HomeContent[]>(url).pipe(map((rows) => rows[0] ?? { hero_video_url: '' }));
  }

  getEvents(): Observable<EventItem[]> {
    const url = `https://opensheet.elk.sh/${this.SHEET_ID}/events`;
    return this.http.get<EventItem[]>(url);
  }
  getDiscografia(): Observable<CancionItem[]> {
    const url = `https://opensheet.elk.sh/${this.SHEET_ID}/discografia`;
    return this.http.get<CancionItem[]>(url);
  }

  getSecciones(): Observable<SeccionCms[]> {
    const url = `https://opensheet.elk.sh/${this.SHEET_ID}/secciones`;
    return this.http.get<SeccionCms[]>(url);
  }

  getLinksDe(sheetName: string): Observable<LinkItem[]> {
    const url = `https://opensheet.elk.sh/${this.SHEET_ID}/${encodeURIComponent(sheetName)}`;
    return this.http.get<LinkItem[]>(url);
  }
}
