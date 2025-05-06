import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
// import { provideAnalytics, getAnalytics } from '@angular/fire/analytics';
// import { ScreenTrackingService, UserTrackingService } from '@angular/fire/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCwgWS2A4T-TtIN7mM1cdJeP6FoLYlvGBE",
  authDomain: "kensyu10097.firebaseapp.com",
  projectId: "kensyu10097",
  storageBucket: "kensyu10097.firebasestorage.app",
  messagingSenderId: "362602686023",
  appId: "1:362602686023:web:34584773113116a096f362",
  measurementId: "G-KJ7S5Z88Q6"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()), provideCharts(withDefaultRegisterables()),
    // provideAnalytics(() => getAnalytics()),
    // ScreenTrackingService,
    // UserTrackingService,
  ]
};