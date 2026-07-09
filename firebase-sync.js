// ===================================================================
// SIGMA — Firebase Cloud Sync (Real-time, Multi-Device)
// ===================================================================
// මෙම file එකෙන් කරන්නේ, Phone එකෙන් සහ Laptop එකෙන් (හෝ තවත් Device
// වලින්) ඇතුළත් කරන දත්ත, Google Firebase Cloud එකක් හරහා Real-time
// ලෙස Sync කිරීමයි.
//
// ⚠️ Internet නොමැති අවස්ථාවක Local Storage එකෙන්ම System එක සම්පූර්ණයෙන්
// වැඩ කරයි (කිසිවක් නවතින්නේ නැත). Internet ලැබුනු විට, ඇතුළත් කළ දත්ත
// Automatic ලෙස Cloud එකට Sync වී, අනෙක් Device එකටත් Automatic ලෙස පෙන්වයි.
//
// 🔧 SETUP කිරීමට: පහත firebaseConfig object එකේ අගයන් ඔබගේම Firebase
// Project එකෙන් ලබාගත් අගයන්වලින් replace කරන්න. (Setup instructions
// සඳහා FIREBASE_SETUP_GUIDE.md file එක බලන්න.)
// ===================================================================

const firebaseConfig = {
  apiKey: "AIzaSyBrzyAy871UAg5H7GG4Md78-C5843oXaEw",
  authDomain: "sigma-file.firebaseapp.com",
  projectId: "sigma-file",
  storageBucket: "sigma-file.firebasestorage.app",
  messagingSenderId: "437843121070",
  appId: "1:437843121070:web:9fc1c8d8eb266075512e3f"
};

// Cloud එකේ දත්ත සුරැකෙන ස්ථානය (Collection/Document නම් - වෙනස් කිරීමට අවශ්‍ය නැත)
const CLOUD_COLLECTION = 'sigma_office';
const CLOUD_DOC_ID = 'shared_records';

let _cloudDb = null;
let _cloudReady = false;
let _applyingRemoteUpdate = false;
let _cloudSyncTimer = null;
let _cloudInitAttempted = false;

// ===== Cloud Sync ආරම්භ කිරීම (Login සාර්ථක වූ පසු Call වේ) =====
function initCloudSync() {
  if (_cloudInitAttempted) return;
  _cloudInitAttempted = true;

  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'YOUR_API_KEY') {
    // Firebase තවම Configure කර නැත — Local-only ලෙස System එක වැඩ කරයි
    updateCloudStatus('not-configured');
    return;
  }

  try {
    if (typeof firebase === 'undefined') {
      console.warn('SIGMA Cloud Sync: Firebase SDK load වී නැත — Local-only mode.');
      updateCloudStatus('offline');
      return;
    }
    firebase.initializeApp(firebaseConfig);
    _cloudDb = firebase.firestore();

    updateCloudStatus('connecting');

    firebase.auth().signInAnonymously().then(() => {
      _cloudReady = true;
      listenToCloudChanges();
    }).catch((err) => {
      console.warn('SIGMA Cloud Sync: Authentication fail විය:', err);
      updateCloudStatus('offline');
    });
  } catch (e) {
    console.warn('SIGMA Cloud Sync: Initialize කිරීමේදී error එකක්:', e);
    updateCloudStatus('offline');
  }
}

// ===== Cloud එකේ වෙනස්කම් Real-time ලෙස Listen කිරීම =====
function listenToCloudChanges() {
  if (!_cloudDb) return;
  const docRef = _cloudDb.collection(CLOUD_COLLECTION).doc(CLOUD_DOC_ID);

  docRef.onSnapshot((snap) => {
    updateCloudStatus('online');

    if (!snap.exists) {
      // Cloud එකේ තවම දත්ත නැත — දැනට මෙම Device එකේ ඇති Records මුලින්ම උඩුගත කරන්න
      pushRecordsToCloud(true);
      return;
    }

    const cloudData = snap.data();
    const cloudRecords = (cloudData && Array.isArray(cloudData.records)) ? cloudData.records : [];

    const localJson = JSON.stringify(records);
    const cloudJson = JSON.stringify(cloudRecords);
    if (localJson === cloudJson) return; // වෙනසක් නැත, කිසිවක් කරන්න ඕන නැත

    // මෙම Update එක Apply කරන අතරතුර, saveAll() නැවත Cloud එකට Push වීම වළක්වයි (Infinite Loop එකක් වළක්වයි)
    _applyingRemoteUpdate = true;
    records = cloudRecords;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    if (typeof recomputeSerials === 'function') recomputeSerials();
    if (typeof renderTable === 'function') renderTable();
    _applyingRemoteUpdate = false;
  }, (err) => {
    console.warn('SIGMA Cloud Sync: Listener error එකක්:', err);
    updateCloudStatus('offline');
  });
}

// ===== Local වෙනසක් වූ විට Cloud එකට Push කිරීම (saveAll() එකෙන් Call වේ) =====
function pushRecordsToCloud(immediate) {
  if (!_cloudDb || !_cloudReady || _applyingRemoteUpdate) return;

  clearTimeout(_cloudSyncTimer);
  const doPush = () => {
    const docRef = _cloudDb.collection(CLOUD_COLLECTION).doc(CLOUD_DOC_ID);
    docRef.set({
      records: records,
      updatedAt: Date.now()
    }).then(() => {
      updateCloudStatus('online');
    }).catch((err) => {
      console.warn('SIGMA Cloud Sync: Push fail විය:', err);
      updateCloudStatus('offline');
    });
  };

  if (immediate) {
    doPush();
  } else {
    // Debounce කිරීම - වේගවත්ව Edit කරද්දී එකවර Requests ගොඩක් යැවීම වළක්වයි
    _cloudSyncTimer = setTimeout(doPush, 600);
  }
}

// ===== Status Indicator එක Update කිරීම (Officer Info Bar එකේ පේනවා) =====
function updateCloudStatus(status) {
  const el = document.getElementById('cloudSyncStatus');
  if (!el) return;
  if (status === 'online') {
    el.textContent = '☁️ Cloud Sync: සම්බන්ධයි';
    el.style.color = '#16a34a';
  } else if (status === 'connecting') {
    el.textContent = '☁️ Cloud Sync: සම්බන්ධ වෙමින්...';
    el.style.color = '#ca8a04';
  } else if (status === 'not-configured') {
    el.textContent = '☁️ Cloud Sync: සකසා නැත (Local පමණි)';
    el.style.color = '#6b7280';
  } else {
    el.textContent = '☁️ Cloud Sync: Offline (Local පමණි)';
    el.style.color = '#dc2626';
  }
}
