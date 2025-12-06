// toast utility
function showToast(message) {
	const toastEl = document.getElementById("liveToast");
	document.querySelector("#liveToast .toast-body").textContent = message;
	const toast = new bootstrap.Toast(toastEl);
	toast.show();
}

function showDetails(id) {
	showToast(`ID: ${id} の詳細を表示（ダミー）`);
}

function submitContact() {
	const modal = bootstrap.Modal.getInstance(document.getElementById("contactModal"));
	modal.hide();
	showToast("お問い合わせを送信しました。");
}

// フォームバリデーション
(function () {
	"use strict";
	const forms = document.querySelectorAll(".needs-validation");
	Array.from(forms).forEach(function (form) {
		form.addEventListener(
			"submit",
			function (event) {
				if (!form.checkValidity()) {
					event.preventDefault();
					event.stopPropagation();
				} else {
					event.preventDefault();
					showToast("フォームを受け付けました。");
					form.reset();
				}
				form.classList.add("was-validated");
			},
			false
		);
	});
})();

// 画像ギャラリー
(function () {
	const modalEl = document.getElementById("galleryModal");
	const modal = new bootstrap.Modal(modalEl);
	const carouselEl = document.getElementById("galleryCarousel");
	const carousel = new bootstrap.Carousel(carouselEl, { ride: false });

	document.querySelectorAll(".gallery-thumb").forEach(function (img) {
		img.style.cursor = "pointer";
		img.addEventListener("click", function () {
			const idx = Number(this.dataset.index) || 0;
			modal.show();
			setTimeout(() => carousel.to(idx), 150);
		});
	});
})();

// 小さなユーティリティ: サンプルデータをコンソールに表示
console.log("サンプルサイト読み込み完了");
