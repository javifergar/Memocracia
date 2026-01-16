import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ScrollSpyService {
  private activeSubject = new BehaviorSubject<string>('inicio');
  active$ = this.activeSubject.asObservable();

  private ids: string[] = [];
  private handler?: () => void;
  private ticking = false;

  private triggerRatio = 0.35;

  observe(ids: string[], triggerRatio: number = 0.35) {
    this.disconnect();

    this.ids = ids;
    this.triggerRatio = triggerRatio;

    this.handler = () => {
      if (this.ticking) return;
      this.ticking = true;

      requestAnimationFrame(() => {
        this.ticking = false;
        this.computeActive();
      });
    };

    window.addEventListener('scroll', this.handler, { passive: true });
    window.addEventListener('resize', this.handler, { passive: true });

    this.computeActive();
  }

  private computeActive() {
    const triggerY = window.innerHeight * this.triggerRatio;

    const sections = this.ids
      .map((id) => {
        const el = document.getElementById(id);
        if (!el) return null;
        return { id, top: el.getBoundingClientRect().top };
      })
      .filter((x): x is { id: any; top: number } => !!x)
      .sort((a, b) => a.top - b.top);

    if (!sections.length) return;

    // ✅ NUEVO: si estás en el final de la página, marca la última sección
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const viewportBottom = scrollY + window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;

    if (viewportBottom >= docHeight - 8) {
      // 8px de margen
      const lastId = sections[sections.length - 1].id;
      if (this.activeSubject.value !== lastId) this.activeSubject.next(lastId);
      return;
    }

    // Regla normal: última sección que ha pasado el trigger
    let current = sections[0].id;
    for (const s of sections) {
      if (s.top <= triggerY) current = s.id;
      else break;
    }

    if (this.activeSubject.value !== current) {
      this.activeSubject.next(current);
    }
  }

  disconnect() {
    if (this.handler) {
      window.removeEventListener('scroll', this.handler);
      window.removeEventListener('resize', this.handler);
    }
    this.handler = undefined;
    this.ids = [];
  }
}
