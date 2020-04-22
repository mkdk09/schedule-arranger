'use strict';
const request = require('supertest');
const app = require('../app');
const passportStub = require('passport-stub');
const User = require('../models/user');
const Schedule = require('../models/schedule');
const Candidate = require('../models/candidate');

describe('/login', () => {
    beforeAll(() => {
        passportStub.install(app);
        passportStub.login({ username: 'testuser' });
    });

    afterAll(() => {
        passportStub.logout();
        passportStub.uninstall(app);
    });

    test('ログインのためのリンクが含まれる', () => {
        return request(app).get('/login')
        .expect('Content-Type', 'text/html; charset=utf-8')
        .expect(/<a href="\/auth\/github"/)
        .expect(200);
    });

    test('ログイン時はユーザ名が表示される' , () => {
        return request(app)
        .get('/login')
        .expect(/testuser/)
        .expect(200);
    });
});

describe('logout', () => {
    test('/ にリダイレクトされる', () => {
        return request(app)
        .get('/logout')
        .expect('Location', '/')
        .expect(302);
    });
});

describe('/schedules', () => {
    beforeAll(() => {
      passportStub.install(app);
      passportStub.login({ id: 0, username: 'testuser' });
    });
  
    afterAll(() => {
      passportStub.logout();
      passportStub.uninstall(app);
    });
  
    it('予定が作成でき、表示される', (done) => {
      User.upsert({ userId: 0, username: 'testuser' }).then(() => {
        request(app)
          .post('/schedules')
          .send({ scheduleName: 'テスト予定1', memo: 'テストメモ1\r\nテストメモ2', candidates: 'テスト候補1\r\nテスト候補2\r\nテスト候補3' })
          .expect('Location', /schedules/)
          .expect(302)
          .end((err, res) => {
            let createdSchedulePath = res.headers.location;
            request(app)
              .get(createdSchedulePath)
              .expect(/テスト予定1/)
              .expect(/テストメモ1/)
              .expect(/テストメモ2/)
              .expect(/テスト候補1/)
              .expect(/テスト候補2/)
              .expect(/テスト候補3/)
              .expect(200)
              .end((err, res) => {
                // テストで作成したデータを削除
                let scheduleId = createdSchedulePath.split('/schedules/')[1];
                Candidate.findAll({
                  where: { scheduleId: scheduleId }
                }).then((candidates) => {
                  candidates.forEach((c) => { c.destroy(); });
                  Schedule.findById(scheduleId).then((s) => { s.destroy(); });
                });
                if (err) return done(err);
                done();
              });
          });
      });
    });
});