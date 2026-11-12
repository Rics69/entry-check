import type { Trip, ZoneCode } from "@/lib/rules/types";
import { zoneOf } from "@/lib/rules/engine";

/**
 * Точки на глобусе первого экрана: главные города прилёта по 16 зонам и города отправления из примеров.
 * Широта, долгота. Точность — для картинки, не для навигации.
 */
const ZONE_POINTS: Record<ZoneCode, [number, number]> = {
  TH: [13.75, 100.5],
  VN: [21.03, 105.85],
  ID: [-8.65, 115.22],
  TR: [41.01, 28.98],
  AE: [25.2, 55.27],
  EG: [30.04, 31.24],
  LK: [6.93, 79.86],
  MY: [3.14, 101.69],
  IN: [15.3, 74.12],
  CN: [39.9, 116.41],
  GB: [51.51, -0.13],
  SCHENGEN: [48.86, 2.35],
  SG: [1.35, 103.82],
  KR: [37.57, 126.98],
  JP: [35.68, 139.65],
  US: [40.71, -74.01],
};

/** Откуда летят в примерах (паспорт → город вылета). */
const ORIGINS: Partial<Record<string, [number, number]>> = {
  RU: [55.76, 37.62],
  US: [40.71, -74.01],
};

function pointOf(country: string): [number, number] | null {
  const zone = zoneOf(country);
  return zone ? ZONE_POINTS[zone] : null;
}

export function globeMarkers() {
  return Object.values(ZONE_POINTS).map((location) => ({ location, size: 0.03 }));
}

/** Дуги маршрута из примера и точка, к которой развернуть глобус (середина маршрута). */
export function globeRoute(trip: Trip) {
  const points = [ORIGINS[trip.passport], ...trip.stops.map((s) => pointOf(s.country))].filter(
    (p): p is [number, number] => Boolean(p),
  );
  const arcs = points.slice(1).map((to, i) => ({ from: points[i], to }));
  const lat = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const lng = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  return { arcs, focus: [lat, lng] as [number, number] };
}
