import {
  Component,
  AfterViewInit,
  OnDestroy,
  OnInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ScrollSpyService } from '../../services/scroll-spy';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  SheetsCmsService,
  EventItem,
  CancionItem,
  LinkItem,
} from '../../services/sheets-cms.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private spy = inject(ScrollSpyService);
  private cms = inject(SheetsCmsService);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);
  private isDragging = false;
  private pointerId: number | null = null;

  private dragStartX = 0;
  private dragStartScrollLeft = 0;

  private rafId: number | null = null;
  private targetScrollLeft = 0;

  private arrastreX = 0;
  private bloqueoClick = false;
  private UMBRAL_DRAG = 8; // px
  private downOnInteractive = false;
  private clickBlockTimeout: any = null;

  heroVideoUrl?: SafeResourceUrl;
  events: EventItem[] = [];
  heroVideoLink = ''; // para fallback a "ver en YouTube"
  discografia: { titulo: string; embedUrl: SafeResourceUrl; link: string }[] = [];
  seccionesDinamicas: Array<{
    slug: string;
    titulo: string;
    tipo: string;
    items: LinkItem[];
  }> = [];

  ngOnInit(): void {
    this.cms.getHome().subscribe({
      next: (home) => {
        const raw = (home.hero_video_url || '').trim();
        this.heroVideoLink = raw;

        const id = this.extractYoutubeId(raw);
        if (!id) {
          this.heroVideoUrl = undefined;
          this.cdr.detectChanges();
          return;
        }

        this.heroVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://www.youtube.com/embed/${id}`
        );

        this.cdr.detectChanges();
      },
      error: (err) => console.error('HOME ERROR:', err),
    });
    this.cms.getEvents().subscribe({
      next: (items) => {
        this.events = items.slice().reverse(); // 👈 muestra el último de la sheet primero
        this.cdr.detectChanges();
      },
      error: (err) => console.error('EVENTS ERROR:', err),
    });
    this.cms.getSecciones().subscribe({
      next: (secs) => {
        const activas = (secs || [])
          .filter((s) => (s.activo ?? '').toString().toLowerCase() !== 'false')
          .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));

        activas.forEach((s) => {
          if ((s.tipo || '').toLowerCase() === 'links') {
            this.cms.getLinksDe(s.sheet).subscribe({
              next: (items) => {
                this.seccionesDinamicas.push({
                  slug: s.slug,
                  titulo: s.titulo,
                  tipo: s.tipo,
                  items: (items || []).filter(
                    (x) => (x.nombre || '').trim() && (x.url || '').trim()
                  ),
                });

                // reordenar por si llegan async desordenadas
                this.seccionesDinamicas.sort(
                  (a, b) =>
                    activas.findIndex((x) => x.slug === a.slug) -
                    activas.findIndex((x) => x.slug === b.slug)
                );
                this.refrescarSpy();
                this.cdr.detectChanges();
              },
              error: (err) => console.error('SECCION LINKS ERROR:', s.sheet, err),
            });
          }
        });
      },
      error: (err) => console.error('SECCIONES ERROR:', err),
    });
  }

  // ✅ botones carrusel
  nextEvent() {
    const track = document.getElementById('eventsTrack');
    if (!track) return;

    const card = track.querySelector<HTMLElement>('.event-card');
    const step = (card?.offsetWidth ?? 360) + 12;
    track.scrollBy({ left: -step, behavior: 'smooth' }); // 👈 antes era +
  }

  prevEvent() {
    const track = document.getElementById('eventsTrack');
    if (!track) return;

    const card = track.querySelector<HTMLElement>('.event-card');
    const step = (card?.offsetWidth ?? 360) + 12;
    track.scrollBy({ left: step, behavior: 'smooth' }); // 👈 antes era -
  }

  private extractYoutubeId(input: string): string {
    const s = (input || '').trim();
    if (!s) return '';

    // Si ya es un ID (11 chars típicos)
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;

    // Intenta parsear como URL
    try {
      const url = new URL(s);

      // youtu.be/ID
      if (url.hostname.includes('youtu.be')) {
        const id = url.pathname.replace('/', '');
        return id || '';
      }

      // youtube.com/watch?v=ID
      const v = url.searchParams.get('v');
      if (v) return v;

      // youtube.com/embed/ID
      const embedMatch = url.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch?.[1]) return embedMatch[1];

      // youtube.com/shorts/ID
      const shortsMatch = url.pathname.match(/\/shorts\/([^/?]+)/);
      if (shortsMatch?.[1]) return shortsMatch[1];

      return '';
    } catch {
      // Si no es una URL válida, último intento por regex
      const watch = s.match(/[?&]v=([^&]+)/);
      if (watch?.[1]) return watch[1];

      const short = s.match(/youtu\.be\/([^?]+)/);
      if (short?.[1]) return short[1];

      const embed = s.match(/youtube\.com\/embed\/([^?]+)/);
      if (embed?.[1]) return embed[1];

      const shorts = s.match(/youtube\.com\/shorts\/([^?]+)/);
      if (shorts?.[1]) return shorts[1];

      return '';
    }
  }

  private refrescarSpy() {
    const dinamicas = this.seccionesDinamicas.map((s) => s.slug);
    this.spy.observe(['inicio', 'eventos', ...dinamicas, 'contacto'], 0.38);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.spy.observe(['inicio', 'eventos'], 0.38), 0);

    // ✅ Bloquea clicks SOLO si hubo arrastre
    const track = document.getElementById('eventsTrack');
    if (track) {
      track.addEventListener(
        'click',
        (e) => {
          if (!this.bloqueoClick) return;
          e.preventDefault();
          e.stopPropagation();
        },
        true
      );
    }
  }

  ngOnDestroy(): void {
    this.spy.disconnect();
  }

  onPointerDown(ev: PointerEvent) {
    const track = document.getElementById('eventsTrack') as HTMLElement | null;
    if (!track) return;

    if (ev.pointerType === 'mouse' && ev.button !== 0) return;

    const target = ev.target as HTMLElement | null;
    const interactive = target?.closest('a,button,input,textarea,select,label');

    // ✅ Si empiezas en un enlace/botón: no tocamos nada (deja que el navegador navegue)
    if (interactive) {
      this.pointerId = null;
      this.isDragging = false;
      this.bloqueoClick = false;
      return;
    }

    // ✅ Gesto normal para arrastrar
    this.isDragging = false;
    this.pointerId = ev.pointerId;

    track.setPointerCapture(ev.pointerId);

    const rect = track.getBoundingClientRect();
    this.dragStartX = ev.clientX - rect.left;
    this.dragStartScrollLeft = track.scrollLeft;

    this.targetScrollLeft = track.scrollLeft;
    this.arrastreX = 0;
    this.bloqueoClick = false;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  onPointerMove(ev: PointerEvent) {
    if (this.pointerId !== ev.pointerId) return;

    const track = document.getElementById('eventsTrack') as HTMLElement | null;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const dx = x - this.dragStartX;

    const absDx = Math.abs(dx);

    if (!this.isDragging && absDx > this.UMBRAL_DRAG) {
      this.isDragging = true;
      this.bloqueoClick = true;
      track.classList.add('dragging');
    }

    if (!this.isDragging) return;

    this.targetScrollLeft = this.dragStartScrollLeft - dx;

    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        track.scrollLeft = this.targetScrollLeft;
      });
    }

    ev.preventDefault();
  }

  onPointerUp(ev: PointerEvent) {
    const track = document.getElementById('eventsTrack') as HTMLElement | null;
    if (!track) return;

    if (this.pointerId !== ev.pointerId) return;

    track.classList.remove('dragging');

    // ✅ libera el capture
    try {
      track.releasePointerCapture(ev.pointerId);
    } catch {}

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.pointerId = null;

    if (this.bloqueoClick) {
      // se come el click post-drag
      setTimeout(() => (this.bloqueoClick = false), 0);
    }
    this.isDragging = false;
  }

  getLinkImage(it: LinkItem): string {
    const direct = (it.image_url || '').trim();
    if (direct) return direct;

    // fallback: favicon automático según el dominio del link
    return this.faviconFromUrl(it.url);
  }

  private faviconFromUrl(urlStr: string): string {
    try {
      const host = new URL(urlStr).hostname;
      // favicon de Google (rápido y cómodo)
      return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
    } catch {
      // fallback neutro
      return 'assets/images/memo.jpg';
    }
  }
}
