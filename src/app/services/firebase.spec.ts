import { TestBed } from '@angular/core/testing';

import { auth, db } from './firebase';

describe('Firebase services', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should initialize Auth and Firestore', () => {
    expect(auth).toBeTruthy();
    expect(db).toBeTruthy();
  });
});
