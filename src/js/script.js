/* global Handlebars, utils, dataSource */ // eslint-disable-line no-unused-vars

{
  ("use strict");

  const select = {
    templateOf: {
      menuProduct: "#template-menu-product",
    },
    containerOf: {
      menu: "#product-list",
      cart: "#cart",
    },
    all: {
      menuProducts: "#product-list > .product",
      menuProductsActive: "#product-list > .product.active",
      formInputs: "input, select",
    },
    menuProduct: {
      clickable: ".product__header",
      form: ".product__order",
      priceElem: ".product__total-price .price",
      imageWrapper: ".product__images",
      amountWidget: ".widget-amount",
      cartButton: '[href="#add-to-cart"]',
    },
    widgets: {
      amount: {
        input: 'input[name="amount"]',
        linkDecrease: 'a[href="#less"]',
        linkIncrease: 'a[href="#more"]',
      },
    },
  };

  const classNames = {
    menuProduct: {
      wrapperActive: "active",
      imageVisible: "active",
    },
  };

  const settings = {
    amountWidget: {
      defaultValue: 1,
      defaultMin: 1,
      defaultMax: 9,
    },
  };

  const templates = {
    menuProduct: Handlebars.compile(document.querySelector(select.templateOf.menuProduct).innerHTML),
  };

  class Product {
    constructor(id, data) {
      this.id = id;
      this.data = { ...data, id };

      this.renderInMenu();
      this.getElements();
      this.initAccordion();
      this.initOrderForm();
      this.processOrder();
    }

    renderInMenu() {
      const generatedHTML = templates.menuProduct(this.data);

      this.element = utils.createDOMFromHTML(generatedHTML);

      const menuContainer = document.querySelector(select.containerOf.menu);

      menuContainer.appendChild(this.element);
    }

    initAccordion() {
      this.accordionTrigger.addEventListener("click", event => {
        event.preventDefault();

        const activeMenuProduct = document.querySelector(select.all.menuProductsActive);
        if (activeMenuProduct && activeMenuProduct.getAttribute("data-type") !== this.id)
          activeMenuProduct.classList.remove("active");

        this.element.classList.toggle("active");
      });
    }

    initOrderForm() {
      this.form.addEventListener("submit", event => {
        event.preventDefault();
        this.processOrder();
      });

      for (let input of this.formInputs) {
        input.addEventListener("change", () => {
          this.processOrder();
        });
      }

      this.cartButton.addEventListener("click", event => {
        event.preventDefault();
        this.processOrder();
      });
    }

    processOrder() {
      const formData = utils.serializeFormToObject(this.form);

      let price = this.data.price; // set price to default price

      // O(n^2) Painful...
      for (let paramId in this.data.params) {
        // determine param value, e.g. paramId = 'toppings', param = { label: 'Toppings', type: 'checkboxes'... }
        const param = this.data.params[paramId];

        for (let optionId in param.options) {
          // determine option value, e.g. optionId = 'olives', option = { label: 'Olives', price: 2, default: true }
          const option = param.options[optionId];

          // check whether optionId of paramId is chosen within form
          const isOptionSet = formData[paramId].includes(optionId);

          // if option is not set and it's default then decrease the price
          if (!isOptionSet && option.default) price -= option.price;
          // if option set and it's not default then increase the price
          else if (isOptionSet && !option.default) price += option.price;
        }
      }

      this.priceElem.innerHTML = price;
    }

    getElements() {
      this.accordionTrigger = this.element.querySelector(select.menuProduct.clickable);
      this.form = this.element.querySelector(select.menuProduct.form);
      this.formInputs = this.form.querySelectorAll(select.all.formInputs);
      this.cartButton = this.element.querySelector(select.menuProduct.cartButton);
      this.priceElem = this.element.querySelector(select.menuProduct.priceElem);
    }
  }

  const app = {
    initMenu() {
      for (let productData in this.data.products) {
        new Product(productData, this.data.products[productData]);
      }
    },

    initData() {
      const thisApp = this;
      thisApp.data = dataSource;
    },

    init: function () {
      const thisApp = this;
      // console.log("*** App starting ***");
      // console.log("thisApp:", thisApp);
      // console.log("classNames:", classNames);
      // console.log("settings:", settings);
      // console.log("templates:", templates);

      thisApp.initData();
      thisApp.initMenu();
    },
  };

  app.init();
}
