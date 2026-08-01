#!/usr/bin/env python3
import aws_cdk as cdk
from nagotime_stack import NagoTimeStack

app = cdk.App()
NagoTimeStack(app, "NagoTimeStack",
    env=cdk.Environment(
        account=app.node.try_get_context("account"),
        region=app.node.try_get_context("region") or "ap-northeast-1"
    )
)

app.synth()
