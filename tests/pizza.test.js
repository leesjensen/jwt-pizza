import { get } from 'http';
import { test, expect } from 'playwright-test-coverage';

test('register', async ({ page }) => {
  await page.route('*/**/api/auth', async (route) => {
    const regReq = { email: 'bud@cow.com', password: 'password' };
    const regRes = { user: { id: 99, name: 'bud', email: 'bud@cow.com', roles: [{ role: 'diner' }] }, token: 'abcdef' };
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toMatchObject(regReq);
    await route.fulfill({ json: regRes });
  });
  await page.goto('http://localhost:5173/');
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByPlaceholder('Full name').click();
  await page.getByPlaceholder('Full name').fill('bud');
  await page.getByPlaceholder('Full name').press('Tab');
  await page.getByPlaceholder('Email address').fill('bud@cow.com');
  await page.getByPlaceholder('Email address').press('Tab');
  await page.getByPlaceholder('Password').fill('password');
  await page.getByRole('button', { name: 'Register' }).click();
});

test('purchase with login', async ({ page }) => {
  await page.route('*/**/api/order/menu', async (route) => {
    const menuRes = [
      { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
      { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: menuRes });
  });

  await page.route('*/**/api/franchise', async (route) => {
    const franchiseRes = [
      {
        id: 2,
        name: 'LotaPizza',
        stores: [
          { id: 4, name: 'Lehi' },
          { id: 5, name: 'Springville' },
          { id: 6, name: 'American Fork' },
        ],
      },
      { id: 3, name: 'PizzaCorp', stores: [{ id: 7, name: 'Spanish Fork' }] },
      { id: 4, name: 'topSpot', stores: [] },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: franchiseRes });
  });

  await page.route('*/**/api/auth', async (route) => {
    const loginReq = { email: 'd@jwt.com', password: 'a' };
    const loginRes = { user: { id: 3, name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] }, token: 'abcdef' };
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

  await page.route('*/**/api/order', async (route) => {
    const orderReq = {
      items: [
        { menuId: 1, description: 'Veggie', price: 0.0038 },
        { menuId: 2, description: 'Pepperoni', price: 0.0042 },
      ],
      storeId: '4',
      franchiseId: 2,
    };
    const orderRes = {
      order: {
        items: [
          { menuId: 1, description: 'Veggie', price: 0.0038 },
          { menuId: 2, description: 'Pepperoni', price: 0.0042 },
        ],
        storeId: '4',
        franchiseId: 2,
        id: 23,
      },
      jwt: 'eyJpYXQ',
    };
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toMatchObject(orderReq);
    await route.fulfill({ json: orderRes });
  });

  await page.goto('http://localhost:5173/');

  // Go to order page
  await page.getByRole('button', { name: 'Order now' }).click();

  // Create order
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();

  // Login
  await page.getByPlaceholder('Email address').click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Email address').press('Tab');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  // Pay
  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tbody')).toContainText('Veggie');
  await expect(page.locator('tbody')).toContainText('Pepperoni');
  await expect(page.locator('tfoot')).toContainText('0.008 ₿');
  await page.getByRole('button', { name: 'Pay now' }).click();

  // Check balance
  await expect(page.getByText('0.008')).toBeVisible();
});

test('admin page', async ({ page }) => {
  let getFranchiseResPos = 0;
  const getFranchiseRes = [
    [{ id: 5, name: 'originalPizza', admins: [{ id: 3, name: '常用名字', email: 'a@jwt.com' }], stores: [] }],
    [
      { id: 5, name: 'originalPizza', admins: [{ id: 3, name: '常用名字', email: 'a@jwt.com' }], stores: [] },
      { id: 18, name: 'tacoPizza', admins: [{ id: 3, name: '常用名字', email: 'a@jwt.com' }], stores: [] },
    ],
    [{ id: 5, name: 'originalPizza', admins: [{ id: 3, name: '常用名字', email: 'a@jwt.com' }], stores: [] }],
  ];

  await page.route('*/**/api/auth', async (route) => {
    const loginRes = { user: { id: 3, name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' }] }, token: 'abcdefg' };
    await route.fulfill({ json: loginRes });
  });

  await page.route('*/**/api/franchise', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: getFranchiseRes[getFranchiseResPos++] });
    } else if (route.request().method() === 'POST') {
      await route.fulfill({
        json: { stores: [], name: 'tacoPizza', admins: [{ email: 'a@jwt.com', id: 3, name: '常用名字' }], id: 18 },
      });
    }
  });

  await page.route('*/**/api/franchise/18', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { message: 'franchise deleted' } });
    }
  });

  await page.goto('http://localhost:5173/login');

  await page.getByPlaceholder('Email address').click();
  await page.getByPlaceholder('Email address').fill('a@jwt.com');
  await page.getByPlaceholder('Email address').press('Tab');
  await page.getByPlaceholder('Password').fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.getByRole('link', { name: 'Admin' }).click();

  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await page.getByPlaceholder('franchise name').click();
  await page.getByPlaceholder('franchise name').fill('tacoPizza');
  await page.getByPlaceholder('franchise name').press('Tab');
  await page.getByPlaceholder('franchisee admin email').fill('a@jwt.com');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('table tr')).toHaveCount(3);
  await page.getByRole('row', { name: 'tacoPizza 常用名字 Close' }).getByRole('button').click();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('table tr')).toHaveCount(2);
});

test('non-interactive pages', async ({ page }) => {
  await page.route('*/**/api/auth', async (route) => {
    const loginRes = { user: { id: 3, name: 'admin', email: 'a@jwt.com', roles: [{ role: 'admin' }] }, token: 'abcdefg' };
    await route.fulfill({ json: loginRes });
  });

  await page.goto('http://localhost:5173/login');

  await page.getByPlaceholder('Email address').click();
  await page.getByPlaceholder('Email address').fill('a@jwt.com');
  await page.getByPlaceholder('Email address').press('Tab');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.goto('http://localhost:5173/diner-dashboard');
  await page.goto('http://localhost:5173/franchise-dashboard');
  await page.goto('http://localhost:5173/history');
  await page.goto('http://localhost:5173/about');
});

test('docs', async ({ page }) => {
  await page.route('*/**/api/docs', async (route) => {
    await route.fulfill({
      json: {
        version: '20240725.172710',
        endpoints: [
          {
            method: 'POST',
            path: '/api/auth',
            description: 'Register a new user',
            example: 'curl -X POST localhost:3000/api/auth -d \'{"name":"pizza diner", "email":"d@jwt.com", "password":"diner"}\' -H \'Content-Type: application/json\'',
            response: {
              user: {
                id: 2,
                name: 'pizza diner',
                email: 'd@jwt.com',
                roles: [
                  {
                    role: 'diner',
                  },
                ],
              },
              token: 'tttttt',
            },
          },
        ],
      },
    });
  });

  await page.goto('http://localhost:5173/docs');
});
