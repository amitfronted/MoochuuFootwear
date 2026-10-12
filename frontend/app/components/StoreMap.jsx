'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

const defaultCenter = [28.4744, 77.504];

const storeIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 36px;
      height: 36px;
      background: #111827;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 8px #0004;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="
        color: white;
        transform: rotate(45deg);
        font-size: 16px;
        font-weight: bold;
      ">M</span>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -34],
});

function MapController({ selectedStore }) {
  const map = useMap();

  useEffect(() => {
    if (
      selectedStore &&
      Number.isFinite(Number(selectedStore.latitude)) &&
      Number.isFinite(Number(selectedStore.longitude))
    ) {
      map.flyTo(
        [Number(selectedStore.latitude), Number(selectedStore.longitude)],
        15,
        { duration: 0.8 },
      );
    }
  }, [selectedStore, map]);

  return null;
}

export default function StoreMap({
  stores = [],
  selectedStore,
  onSelectStore,
}) {
  const validStores = stores.filter(
    (store) =>
      Number.isFinite(Number(store.latitude)) &&
      Number.isFinite(Number(store.longitude)) &&
      Number(store.latitude) >= -90 &&
      Number(store.latitude) <= 90 &&
      Number(store.longitude) >= -180 &&
      Number(store.longitude) <= 180,
  );

  const center = selectedStore
    ? [Number(selectedStore.latitude), Number(selectedStore.longitude)]
    : validStores.length
      ? [Number(validStores[0].latitude), Number(validStores[0].longitude)]
      : defaultCenter;

  return (
    <MapContainer
      center={center}
      zoom={validStores.length ? 11 : 5}
      scrollWheelZoom
      className="h-full min-h-105 w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController selectedStore={selectedStore} />

      {validStores.map((store) => (
        <Marker
          key={store._id}
          position={[Number(store.latitude), Number(store.longitude)]}
          icon={storeIcon}
          eventHandlers={{
            click: () => onSelectStore?.(store),
          }}
        >
          <Popup>
            <div className="min-w-45 space-y-2">
              <h3 className="font-semibold">{store.name}</h3>
              <p>
                {store.address}, {store.city}
              </p>
              <p>
                {store.openingTime} – {store.closingTime}
              </p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block font-semibold underline"
              >
                Get Directions
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
