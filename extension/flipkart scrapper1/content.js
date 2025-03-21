async function fetchHTML(url) {
    console.log("Fetching URL:", url);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Accept-Language": "en-IN,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://www.flipkart.com/"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    console.log("Fetched HTML length:", text.length);
    return text;
  }
  
  function extractData(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
  
    // Extract product details dynamically from the current page
    const productName = doc.querySelector("div.Vu3-9u.eCtPz5")
                          ? doc.querySelector("div.Vu3-9u.eCtPz5").innerText.trim()
                          : "N/A";
    const productName_New = doc.querySelector("p.VU-ZEz")
                          ? doc.querySelector("p.VU-ZEz").innerText.trim()
                          :"N/A";
    const salePrice = doc.querySelector("div.hl05eU")
                          ? doc.querySelector("div.hl05eU").innerText.trim()
                          : "N/A";
    const originalPrice = doc.querySelector("div.yRaY8j")
                          ? doc.querySelector("div.yRaY8j").innerText.trim()
                          : "N/A";
    const discount = doc.querySelector("div.UkUFwK span")
                          ? doc.querySelector("div.UkUFwK span").innerText.trim()
                          : "N/A";
  
    const reviewsData = [];
    const reviewContainers = doc.querySelectorAll("div.col.EPCmJX");
  
    console.log("Found", reviewContainers.length, "review containers on", productName);
    reviewContainers.forEach(review => {
      try {
        const ratingElem = review.querySelector("div.XQDdHH.Ga3i8K");
        const rating = ratingElem ? ratingElem.firstChild.textContent.trim() : null;
  
        const reviewTitleElem = review.querySelector("p.z9E0IG");
        const reviewTitle = reviewTitleElem ? reviewTitleElem.innerText.trim() : null;
  
        const reviewDescElem = review.querySelector("div.ZmyHeo");
        let reviewDesc = reviewDescElem ? reviewDescElem.innerText.trim() : null;
        if (reviewDesc && reviewDesc.includes("READ MORE")) {
          reviewDesc = reviewDesc.replace("READ MORE", "").trim();
        }
  
        const reviewerName = review.querySelector("p.AwS1CA")
                               ? review.querySelector("p.AwS1CA").innerText.trim()
                               : null;
        const reviewDate = review.querySelector("p._2NsDsF")
                               ? review.querySelector("p._2NsDsF").innerText.trim()
                               : null;
        const reviewLocation = review.querySelector("span.MztJPv > span:nth-child(2)")
                               ? review.querySelector("span.MztJPv > span:nth-child(2)").innerText.trim()
                               : null;
        const upvotes = review.querySelector("div._6kK6mk > span.tl9VpF")
                               ? review.querySelector("div._6kK6mk > span.tl9VpF").innerText.trim()
                               : "0";
        const downvotes = review.querySelector("div._6kK6mk.aQymJL > span.tl9VpF")
                               ? review.querySelector("div._6kK6mk.aQymJL > span.tl9VpF").innerText.trim()
                               : "0";
  
        reviewsData.push({
          rating,
          review_title: reviewTitle,
          review_desc: reviewDesc,
          reviewer_name: reviewerName,
          review_date: reviewDate,
          review_location: reviewLocation,
          upvotes,
          downvotes
        });
      } catch (e) {
        console.error("Error parsing a review:", e);
      }
    });
  
    // Look for a "Next" button dynamically (adjust selector if needed)
    const nextPageElement = doc.querySelector("a._9QVEpD");
    const nextPageUrl = nextPageElement ? nextPageElement.href : null;
    if (nextPageUrl) {
      console.log("Next page URL found:", nextPageUrl);
    } else {
      console.log("No next page URL found.");
    }
  
    return {
      product_name: productName,
      product_title:productName_New,
      sale_price: salePrice,
      original_price: originalPrice,
      discount: discount,
      reviews: reviewsData,
      next_page: nextPageUrl
    };
  }
  
  async function scrapeAllPages(startUrl) {
    let currentPage = startUrl;
    let allProducts = [];
    let pageCount = 0;
  
    // Continue scraping until no next page is found
    while (currentPage) {
      pageCount++;
      console.log(`\n----- Fetching Page ${pageCount} -----`);
      try {
        const html = await fetchHTML(currentPage);
        const productData = extractData(html);
        allProducts.push(productData);
        if (productData.next_page) {
          currentPage = new URL(productData.next_page, currentPage).href;
        } else {
          currentPage = null;
        }
      } catch (error) {
        // If an error occurs, break the loop
        break;
      }
    }
    console.log("Scraping complete. Total pages scraped:", pageCount);
    return allProducts;
  }
  
  function convertToCSV(data) {
    const rows = [];
    const headers = [
      "rating",
      "review_title",
      "review_desc",
      "reviewer_name",
      "review_date",
      "review_location",
      "upvotes",
      "downvotes",
      "product_name",
      "sale_price",
      "original_price",
      "discount"
    ];
    rows.push(headers.join(","));
  
    data.forEach(product => {
      product.reviews.forEach(review => {
        const row = [
          review.rating,
          review.review_title,
          review.review_desc,
          review.reviewer_name,
          review.review_date,
          review.review_location,
          review.upvotes,
          review.downvotes,
          product.product_name,
          product.sale_price,
          product.original_price,
          product.discount
        ];
        rows.push(row.join(","));
      });
    });
    return rows.join("\n");
  }
  
  function saveData(data) {
    const jsonBlob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonA = document.createElement('a');
    jsonA.href = jsonUrl;
    jsonA.download = 'product_info.json';
    jsonA.click();
    URL.revokeObjectURL(jsonUrl);
  
    const csvData = convertToCSV(data);
    const csvBlob = new Blob([csvData], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvA = document.createElement('a');
    csvA.href = csvUrl;
    csvA.download = 'product_reviews.csv';
    csvA.click();
    URL.revokeObjectURL(csvUrl);
  }
  
  async function main() {
    // Use the current URL dynamically
    const currentUrl = window.location.href;
    console.log("Starting scrape from:", currentUrl);
  
    const allProductsData = await scrapeAllPages(currentUrl);
    saveData(allProductsData);
  }
  
  main();
  