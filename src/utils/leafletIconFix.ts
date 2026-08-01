/**
 * Fix for Leaflet default icon path issues with Vite/webpack bundlers.
 * Import this file once in your app entry point.
 */
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// Delete the default icon prototype _getIconUrl to allow custom icon URLs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl

L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
})
