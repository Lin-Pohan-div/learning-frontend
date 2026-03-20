import axios from "axios";

let loginForm = document.getElementById("loginForm");

if (!loginForm) {
  console.warn("loginForm not found");
} else {
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    let emailInput = document.getElementById("emailInput").value;
    let passwdInput = document.getElementById("passwdInput").value;

    emailInput = emailInput.trim();

    if (!emailInput || !passwdInput) {
      alert("請輸入帳號與密碼");
      return;
    }

    let inputPost = {
      email: emailInput,
      password: passwdInput,
    };

    axios
      .post("http://localhost:8080/api/auth/login", inputPost)
      .then(function (resp) {
        console.log(resp.data);
        alert(resp?.data?.msg || "登入成功");
        window.location.href = "/index.html";
      })
      .catch(function (err) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.msg;

        if (status === 400) {
          alert(msg || "登入失敗");
        } else if (status === 401) {
          alert("帳號或密碼錯誤");
        } else {
          alert("登入失敗");
        }

        console.log(err);
      });
  });
}
