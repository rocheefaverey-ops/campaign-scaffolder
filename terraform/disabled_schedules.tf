resource "google_cloud_scheduler_job" "somecroncall" {
  name             = "__CUSTOMER__NAME__-__CUSTOMER__PROJECT__-__BRANCH__SLUG__-somecroncall"
  schedule         = "0 0 * * *"
  time_zone        = "Europe/Amsterdam"

  http_target {
    http_method = "GET"
    headers = {
        "Authorization" = "__SERVER__SECRET__"
    }
    uri         = "__APP__URL__/api/somecroncall"
  }
}
