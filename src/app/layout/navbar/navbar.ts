import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { ScrollSpyService } from '../../services/scroll-spy';
import { SheetsCmsService, SeccionCms } from '../../services/sheets-cms.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, AsyncPipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent implements OnInit {
  private spy = inject(ScrollSpyService);
  private cms = inject(SheetsCmsService);

  currentYear = new Date().getFullYear();
  active$ = this.spy.active$;

  seccionesNav: SeccionCms[] = [];

  ngOnInit(): void {
    this.cms.getSecciones().subscribe({
      next: (secs) => {
        this.seccionesNav = (secs || [])
          .filter((s) => (s.activo ?? '').toString().toLowerCase() !== 'false')
          .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
      },
      error: (err) => console.error('NAV SECCIONES ERROR:', err),
    });
  }
}
