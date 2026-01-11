import { SectionConfig, toCamelKey } from './specConfig';

export type SectionValues = Record<string, Record<string, string | boolean>>;

export const buildPhoneSpecs = (sectionValues: SectionValues, sections: SectionConfig[]) => {
  const toVarYok = (val: boolean) => (val ? 'Var' : 'Yok');
  const ekran = sectionValues.ekran;
  const batarya = sectionValues.batarya;
  const kamera = sectionValues.kamera;
  const temelDonanim = sectionValues.temelDonanim;
  const ramDepolama = sectionValues.ramDepolama;
  const tasarim = sectionValues.tasarim;
  const ag = sectionValues.agBaglantilari;
  const os = sectionValues.isletimSistemi;
  const kablosuz = sectionValues.kablosuzBaglantilar;
  const cokluOrtam = sectionValues.cokluOrtam;
  const dayaniklilik = sectionValues.dayaniklilik;
  const sensorServis = sectionValues.sensorServis;
  const digerBaglantilar = sectionValues.digerBaglantilar;
  const abEtiket = sectionValues.abEtiket;
  const temelBilgiler = sectionValues.temelBilgiler;

  const dynamicSections = sections.reduce((acc, section) => {
    acc[section.id] = sectionValues[section.id] || {};
    return acc;
  }, {} as Record<string, Record<string, string | boolean>>);

  const networkTechnology = [
    (ag?.[toCamelKey('2G')] as boolean) ? '2G' : '',
    (ag?.[toCamelKey('3G')] as boolean) ? '3G' : '',
    (ag?.[toCamelKey('4G')] as boolean) ? '4G' : '',
    (ag?.[toCamelKey('4.5G Desteği')] as boolean) ? '4.5G' : '',
    (ag?.[toCamelKey('5G')] as boolean) ? '5G' : '',
  ]
    .filter(Boolean)
    .join(' / ');

  const dimensionsParts = [
    tasarim?.[toCamelKey('Boy')] as string,
    tasarim?.[toCamelKey('En')] as string,
    tasarim?.[toCamelKey('Kalınlık')] as string,
  ].filter(v => (v || '').trim() !== '');
  const dimensions = dimensionsParts.length > 0 ? dimensionsParts.join(' × ') : '';

  const wifi = (kablosuz?.[toCamelKey('Wi-Fi Özellikleri')] as string) || '';
  const wifiChannels = (kablosuz?.[toCamelKey('Wi-Fi Kanalları')] as string) || '';
  const wlan = [wifi, wifiChannels ? `(${wifiChannels})` : ''].filter(Boolean).join(' ');

  const bluetoothVers = (kablosuz?.[toCamelKey('Bluetooth Versiyonu')] as string) || '';
  const bluetoothFeatures = (kablosuz?.[toCamelKey('Bluetooth Özellikleri')] as string) || '';
  const bluetooth = [bluetoothVers, bluetoothFeatures].filter(Boolean).join(' / ');

  const usb = [
    digerBaglantilar?.[toCamelKey('USB Versiyonu')] as string,
    digerBaglantilar?.[toCamelKey('USB Bağlantı Tipi')] as string,
    digerBaglantilar?.[toCamelKey('USB Özellikleri')] as string,
  ]
    .filter(v => (v || '').trim() !== '')
    .join(' / ');

  const videoMain = [
    kamera?.[toCamelKey('Video Kayıt Çözünürlüğü')] as string,
    kamera?.[toCamelKey('Video FPS Değeri')] as string,
  ]
    .filter(v => (v || '').trim() !== '')
    .join(' / ');

  const videoSelfie = [
    kamera?.[toCamelKey('Ön Kamera Video Çözünürlüğü')] as string,
    kamera?.[toCamelKey('Ön Kamera FPS Değeri')] as string,
  ]
    .filter(v => (v || '').trim() !== '')
    .join(' / ');

  const osText = [
    os?.[toCamelKey('İşletim Sistemi')] as string,
    os?.[toCamelKey('İşletim Sistemi Versiyonu')] as string,
  ]
    .filter(v => (v || '').trim() !== '')
    .join(' ');

  return {
    network: {
      technology: networkTechnology,
      announced: (temelBilgiler?.[toCamelKey('Duyurulma Tarihi')] as string) || '',
      status: '',
      ...ag,
    },
    body: {
      dimensions,
      weight: (tasarim?.[toCamelKey('Ağırlık')] as string) || '',
      sim: (digerBaglantilar?.[toCamelKey('SIM')] as string) || '',
      waterResistant: (dayaniklilik?.[toCamelKey('Suya Dayanıklılık Seviyesi')] as string) || '',
      ...tasarim,
      ...dayaniklilik,
    },
    display: {
      type: (ekran?.[toCamelKey('Ekran Teknolojisi')] as string) || '',
      size: (ekran?.[toCamelKey('Ekran Boyutu')] as string) || '',
      resolution: (ekran?.[toCamelKey('Ekran Çözünürlüğü')] as string) || '',
      protection: (ekran?.[toCamelKey('Ekran Dayanıklılığı')] as string) || '',
      ...ekran,
    },
    platform: {
      os: osText,
      chipset: (temelDonanim?.[toCamelKey('Yonga Seti (Chipset)')] as string) || '',
      cpu: (temelDonanim?.[toCamelKey('Ana İşlemci (CPU)')] as string) || '',
      gpu: (temelDonanim?.[toCamelKey('Grafik İşlemcisi (GPU)')] as string) || '',
      cpuArchitecture: (temelDonanim?.[toCamelKey('İşlemci Mimarisi')] as string) || '',
      cpuTechnology: (temelDonanim?.[toCamelKey('CPU Üretim Teknolojisi')] as string) || '',
      cpuCores: (temelDonanim?.[toCamelKey('CPU Çekirdeği')] as string) || '',
      ...temelDonanim,
      ...os,
    },
    memory: {
      cardSlot: toVarYok(!!(ramDepolama?.[toCamelKey('Hafıza Kartı Desteği')] as boolean)),
      internal: (ramDepolama?.[toCamelKey('Dahili Depolama')] as string) || '',
      ram: (ramDepolama?.[toCamelKey('Bellek (RAM)')] as string) || '',
      ...ramDepolama,
    },
    mainCamera: {
      triple: (kamera?.[toCamelKey('Kamera Çözünürlüğü')] as string) || '',
      features: (kamera?.[toCamelKey('Kamera Özellikleri')] as string) || '',
      video: videoMain,
      ois: !!(kamera?.[toCamelKey('Optik Görüntü Sabitleyici (OIS)')] as boolean),
      flash: (kamera?.[toCamelKey('Flaş')] as string) || '',
      aperture: (kamera?.[toCamelKey('Diyafram Açıklığı')] as string) || '',
      focalLength: (kamera?.[toCamelKey('Odak Uzaklığı')] as string) || '',
      sensorSize: (kamera?.[toCamelKey('Kamera Sensör Boyutu')] as string) || '',
      ...kamera,
    },
    selfieCamera: {
      single: (kamera?.[toCamelKey('Ön Kamera Çözünürlüğü')] as string) || '',
      features: (kamera?.[toCamelKey('Ön Kamera Özellikleri')] as string) || '',
      video: videoSelfie,
    },
    sound: {
      loudspeaker: (cokluOrtam?.[toCamelKey('Hoparlör Özellikleri')] as string) || '',
      jack: (cokluOrtam?.[toCamelKey('Ses Çıkışı')] as string) || '',
      ...cokluOrtam,
    },
    comms: {
      wlan,
      bluetooth,
      positioning: (kablosuz?.[toCamelKey('Navigasyon Özellikleri')] as string) || '',
      nfc: toVarYok(!!(kablosuz?.[toCamelKey('NFC')] as boolean)),
      infrared: toVarYok(!!(kablosuz?.[toCamelKey('Kızılötesi')] as boolean)),
      radio: toVarYok(!!(cokluOrtam?.[toCamelKey('Radyo')] as boolean)),
      usb,
      ...kablosuz,
      ...digerBaglantilar,
    },
    features: {
      sensors: (sensorServis?.[toCamelKey('Sensörler')] as string) || '',
      fingerprint: !!(sensorServis?.[toCamelKey('Parmak izi Okuyucu')] as boolean),
      fingerprintFeatures: (sensorServis?.[toCamelKey('Parmak izi Okuyucu Özellikleri')] as string) || '',
      videoCall: !!(sensorServis?.[toCamelKey('Görüntülü Konuşma (Uygulama)')] as boolean),
      notificationLed: !!(sensorServis?.[toCamelKey('Bildirim Işığı (LED)')] as boolean),
      services: (sensorServis?.[toCamelKey('Servis ve Uygulamalar')] as string) || '',
      waterResistance: !!(dayaniklilik?.[toCamelKey('Suya Dayanıklılık')] as boolean),
      waterResistanceLevel: (dayaniklilik?.[toCamelKey('Suya Dayanıklılık Seviyesi')] as string) || '',
      dustResistance: !!(dayaniklilik?.[toCamelKey('Toza Dayanıklılık')] as boolean),
      dustResistanceLevel: (dayaniklilik?.[toCamelKey('Toza Dayanıklılık Seviyesi')] as string) || '',
      ...sensorServis,
      ...dayaniklilik,
    },
    battery: {
      type: (batarya?.[toCamelKey('Batarya Kapasitesi (Tipik)')] as string) || '',
      charging: (batarya?.[toCamelKey('Şarj')] as string) || '',
      fastCharging: !!(batarya?.[toCamelKey('Hızlı Şarj')] as boolean),
      fastChargingPowerMax: (batarya?.[toCamelKey('Hızlı Şarj Gücü (Maks.)')] as string) || '',
      wirelessCharging: !!(batarya?.[toCamelKey('Kablosuz Şarj')] as boolean),
      replaceableBattery: !!(batarya?.[toCamelKey('Değişir Batarya')] as boolean),
      ...batarya,
    },
    misc: {
      colors: (tasarim?.[toCamelKey('Renk Seçenekleri')] as string) || '',
      releaseYear: (temelBilgiler?.[toCamelKey('Çıkış Yılı')] as string) || '',
      series: (temelBilgiler?.[toCamelKey('Seri')] as string) || '',
      eu: { ...abEtiket },
      ...temelBilgiler,
    },
    sections: {
      ...dynamicSections,
    },
  };
};
