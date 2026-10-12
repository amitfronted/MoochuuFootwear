'use client';

export default function StoreMapPicker({ latitude, longitude }) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const valid =
    latitude !== '' &&
    longitude !== '' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;
  const mapLat = valid ? lat : 28.4744;
  const mapLng = valid ? lng : 77.504;
  const delta = valid ? 0.015 : 0.08;
  const bbox = `${mapLng - delta},${mapLat - delta},${mapLng + delta},${mapLat + delta}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik${valid ? `&marker=${mapLat}%2C${mapLng}` : ''}`;
  const mapUrl = `https://www.openstreetmap.org/?mlat=${mapLat}&mlon=${mapLng}#map=${valid ? 16 : 10}/${mapLat}/${mapLng}`;

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">
        Enter the exact latitude and longitude above. The map preview shows the
        selected coordinates. Use OpenStreetMap to find a place, click the map,
        and copy the coordinates into the form.
      </p>
      <div className="h-80 overflow-hidden rounded-lg border border-gray-300 bg-gray-100">
        <iframe
          title="Store location map preview"
          src={embedUrl}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <a
        className="inline-block text-sm font-semibold underline underline-offset-4"
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Find or verify coordinates in OpenStreetMap ↗
      </a>
      {valid && (
        <p className="text-xs text-gray-500">
          Selected coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}
