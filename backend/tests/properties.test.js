const request = require('supertest');
const app = require('../src/app');

let token;

const registerAndLogin = async () => {
  const reg = await request(app).post('/auth/register').send({
    firstName: 'Owner',
    lastName: 'Test',
    email: 'propowner@test.com',
    password: 'Test@1234',
    role: 'owner',
  });
  return reg.body.data.accessToken;
};

const testProperty = {
  name: 'Sunrise Apartments',
  propertyType: 'apartment',
  address: { street: '123 Main St', city: 'Hyderabad', state: 'Telangana', zipCode: '500001', country: 'India' },
  totalUnits: 10,
};

describe('Property Endpoints', () => {
  beforeEach(async () => {
    token = await registerAndLogin();
  });

  describe('POST /api/properties', () => {
    it('should create a property', async () => {
      const res = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send(testProperty);
      expect(res.status).toBe(201);
      expect(res.body.data.property.name).toBe(testProperty.name);
      expect(res.body.data.property.availableUnits).toBe(10);
    });

    it('should reject without name', async () => {
      const res = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send({ propertyType: 'apartment' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/properties', () => {
    it('should list owner properties', async () => {
      await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send(testProperty);

      const res = await request(app)
        .get('/api/properties')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.properties.length).toBe(1);
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/api/properties?page=1&limit=5')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/properties/:id', () => {
    it('should return property by id', async () => {
      const created = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send(testProperty);

      const res = await request(app)
        .get(`/api/properties/${created.body.data.property._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.property.name).toBe(testProperty.name);
    });
  });

  describe('PUT /api/properties/:id', () => {
    it('should update property', async () => {
      const created = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send(testProperty);

      const res = await request(app)
        .put(`/api/properties/${created.body.data.property._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });
      expect(res.status).toBe(200);
      expect(res.body.data.property.name).toBe('Updated Name');
    });
  });

  describe('DELETE /api/properties/:id', () => {
    it('should delete property with no tenants', async () => {
      const created = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send(testProperty);

      const res = await request(app)
        .delete(`/api/properties/${created.body.data.property._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });
});
